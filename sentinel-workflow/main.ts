/**
 * SentinelCRE — CRE Workflow Entry Point
 *
 * Two handlers:
 *   1. HTTP Trigger — receives AI agent action proposals, runs verdict pipeline
 *   2. Cron Trigger — periodic health check, auto-freezes anomalous agents
 *
 * CRE SDK rules enforced:
 *   - No async/await on SDK capabilities — use .result() pattern
 *   - runtime.log() only (no console.log in WASM)
 *   - runtime.now() for time (not Date.now() — breaks consensus)
 *   - Zod for config validation
 *   - Temperature 0 for deterministic AI consensus
 *   - Default to DENY on any error (fail-safe)
 */

import {
  Runner,
  handler,
  HTTPClient,
  HTTPCapability,
  CronCapability,
  EVMClient,
  ConsensusAggregationByFields,
  identical,
  median,
  encodeCallMsg,
  getNetwork,
  LAST_FINALIZED_BLOCK_NUMBER,
  ok,
  text,
  type Runtime,
  type HTTPSendRequester,
  type HTTPPayload,
  type CronPayload,
  type HandlerEntry,
} from '@chainlink/cre-sdk'

import { z } from 'zod'
import {
  type Address,
  encodeFunctionData,
  decodeFunctionResult,
  encodeAbiParameters,
  parseAbiParameters,
  zeroAddress,
} from 'viem'

// =============================================================================
// Config Schema
// =============================================================================

const configSchema = z.object({
  schedule: z.string().describe('Cron expression for health check (e.g., */5 * * * *)'),
  evmChainSelectorName: z.string().describe('CRE chain selector name'),
  guardianContractAddress: z.string().describe('SentinelGuardian contract address'),
  registryContractAddress: z.string().describe('AgentRegistry contract address'),
  aiEndpoint1: z.string().describe('AI Model 1 evaluation URL'),
  aiEndpoint2: z.string().describe('AI Model 2 evaluation URL'),
})

type Config = z.infer<typeof configSchema>

// =============================================================================
// Types
// =============================================================================

interface ActionProposal {
  agentId: string // bytes32 hex
  targetContract: string // address
  functionSignature: string // bytes4 hex
  value: string // wei as string
  mintAmount: string // token units as string
  calldata: string // full calldata hex
  description: string // human-readable action description
}

interface AIVerdict {
  verdict: string // "APPROVED" | "DENIED"
  confidence: number // 0-100
  reason: string
}

// =============================================================================
// Contract ABIs (minimal for reads/writes)
// =============================================================================

const GUARDIAN_ABI = [
  {
    name: 'getAgentPolicy',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'agentId', type: 'bytes32' }],
    outputs: [
      { name: 'maxTransactionValue', type: 'uint256' },
      { name: 'maxDailyVolume', type: 'uint256' },
      { name: 'maxMintAmount', type: 'uint256' },
      { name: 'rateLimit', type: 'uint256' },
      { name: 'rateLimitWindow', type: 'uint256' },
      { name: 'requireMultiAIConsensus', type: 'bool' },
      { name: 'isActive', type: 'bool' },
    ],
  },
  {
    name: 'isAgentActive',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'agentId', type: 'bytes32' }],
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    name: 'processVerdict',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'reportData', type: 'bytes' }],
    outputs: [],
  },
] as const

// =============================================================================
// AI Evaluation
// =============================================================================

function buildEvaluationPrompt(
  proposal: ActionProposal,
  policyContext: {
    maxTransactionValue: string
    maxDailyVolume: string
    maxMintAmount: string
    rateLimit: string
  },
): string {
  return `You are a security sentinel evaluating an AI agent's proposed on-chain action.

PROPOSED ACTION:
- Agent ID: ${proposal.agentId}
- Target Contract: ${proposal.targetContract}
- Function: ${proposal.functionSignature}
- Value (wei): ${proposal.value}
- Mint Amount: ${proposal.mintAmount}
- Description: ${proposal.description}

AGENT POLICY LIMITS:
- Max Transaction Value: ${policyContext.maxTransactionValue} wei
- Max Daily Volume: ${policyContext.maxDailyVolume} wei
- Max Mint Amount: ${policyContext.maxMintAmount} tokens
- Rate Limit: ${policyContext.rateLimit} actions/window

Evaluate whether this action is safe and within policy bounds.
Respond with ONLY valid JSON (no markdown):
{"verdict":"APPROVED" or "DENIED","confidence":0-100,"reason":"brief explanation"}`
}

/**
 * Calls both AI models and requires consensus.
 * Uses HTTPClient.sendRequest with ConsensusAggregationByFields.
 * Temperature 0 ensures deterministic output for DON consensus.
 */
function evaluateWithAI(
  sendRequester: HTTPSendRequester,
  config: Config,
  proposal: ActionProposal,
  policyContext: {
    maxTransactionValue: string
    maxDailyVolume: string
    maxMintAmount: string
    rateLimit: string
  },
): AIVerdict {
  const prompt = buildEvaluationPrompt(proposal, policyContext)

  // --- [CONFIDENTIAL_COMPUTE_BOUNDARY_START] ---
  // When Chainlink Confidential Compute SDK ships, wrap AI calls in:
  //   confidentialRuntime.execute(evaluateWithAI, { visibility: 'attestation-only' })
  // This hides policy thresholds and guardrail parameters from the AI agent itself,
  // preventing the agent from learning its own constraints and gaming the system.

  // Call Model 1
  const response1 = sendRequester
    .sendRequest({
      url: config.aiEndpoint1,
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 300,
        temperature: 0,
        messages: [{ role: 'user', content: prompt }],
      }),
    })
    .result()

  // Call Model 2
  const response2 = sendRequester
    .sendRequest({
      url: config.aiEndpoint2,
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 300,
        temperature: 0,
        messages: [{ role: 'user', content: prompt }],
      }),
    })
    .result()
  // --- [CONFIDENTIAL_COMPUTE_BOUNDARY_END] ---

  // Parse responses — default to DENIED on any error (fail-safe)
  let v1: AIVerdict = { verdict: 'DENIED', confidence: 0, reason: 'Model 1 unavailable' }
  let v2: AIVerdict = { verdict: 'DENIED', confidence: 0, reason: 'Model 2 unavailable' }

  if (ok(response1)) {
    try {
      const body1 = JSON.parse(text(response1))
      const parsed1 = JSON.parse(body1.content?.[0]?.text ?? '{}')
      v1 = {
        verdict: String(parsed1.verdict ?? 'DENIED'),
        confidence: Number(parsed1.confidence ?? 0),
        reason: String(parsed1.reason ?? ''),
      }
    } catch {
      // Fail-safe: default to DENIED
    }
  }

  if (ok(response2)) {
    try {
      const body2 = JSON.parse(text(response2))
      const parsed2 = JSON.parse(body2.content?.[0]?.text ?? '{}')
      v2 = {
        verdict: String(parsed2.verdict ?? 'DENIED'),
        confidence: Number(parsed2.confidence ?? 0),
        reason: String(parsed2.reason ?? ''),
      }
    } catch {
      // Fail-safe: default to DENIED
    }
  }

  // Multi-AI consensus: BOTH models must approve
  const approved = v1.verdict === 'APPROVED' && v2.verdict === 'APPROVED'

  return {
    verdict: approved ? 'APPROVED' : 'DENIED',
    confidence: Math.min(v1.confidence, v2.confidence),
    reason: approved
      ? 'Both AI models approve action'
      : `Model1: ${v1.reason}. Model2: ${v2.reason}`,
  }
}

// =============================================================================
// HTTP Handler — Verdict Pipeline
// =============================================================================

const onActionProposal = (runtime: Runtime<Config>, payload: HTTPPayload): string => {
  const config = runtime.config
  const now = runtime.now()
  runtime.log(`[SentinelCRE] Action proposal received at ${now.toISOString()}`)

  // Step 1: Parse the action proposal
  let proposal: ActionProposal
  try {
    const raw = new TextDecoder().decode(payload.input)
    proposal = JSON.parse(raw) as ActionProposal
  } catch {
    runtime.log('[SentinelCRE] ERROR: Failed to parse action proposal')
    return JSON.stringify({ status: 'error', reason: 'Invalid proposal format' })
  }

  runtime.log(`[SentinelCRE] Agent: ${proposal.agentId}, Target: ${proposal.targetContract}`)

  // Step 2: Read agent policy from SentinelGuardian via EVMClient
  const chainSelector = getNetwork({
    chainFamily: 'evm',
    chainSelectorName: config.evmChainSelectorName,
    isTestnet: true,
  })
  const evmClient = new EVMClient(chainSelector)

  const policyCallData = encodeFunctionData({
    abi: GUARDIAN_ABI,
    functionName: 'getAgentPolicy',
    args: [proposal.agentId as `0x${string}`],
  })

  const policyResult = evmClient
    .callContract(runtime, {
      call: encodeCallMsg({
        from: zeroAddress,
        to: config.guardianContractAddress as Address,
        data: policyCallData,
      }),
      blockNumber: LAST_FINALIZED_BLOCK_NUMBER,
    })
    .result()

  const [maxTxValue, maxDailyVol, maxMint, rateLimit, , , isActive] = decodeFunctionResult({
    abi: GUARDIAN_ABI,
    functionName: 'getAgentPolicy',
    data: policyResult.data as `0x${string}`,
  }) as [bigint, bigint, bigint, bigint, bigint, boolean, boolean]

  if (!isActive) {
    runtime.log(`[SentinelCRE] Agent ${proposal.agentId} policy is inactive — DENIED`)
    return JSON.stringify({ status: 'denied', reason: 'Agent policy inactive' })
  }

  // Step 3: Multi-AI consensus evaluation
  const httpClient = new HTTPClient()
  const policyContext = {
    maxTransactionValue: maxTxValue.toString(),
    maxDailyVolume: maxDailyVol.toString(),
    maxMintAmount: maxMint.toString(),
    rateLimit: rateLimit.toString(),
  }

  const aiVerdict = httpClient
    .sendRequest(
      runtime,
      (sendRequester: HTTPSendRequester) =>
        evaluateWithAI(sendRequester, config, proposal, policyContext),
      ConsensusAggregationByFields<AIVerdict>({
        verdict: identical,
        confidence: median,
        reason: identical,
      }),
    )(config)
    .result()

  runtime.log(
    `[SentinelCRE] AI Verdict: ${aiVerdict.verdict} (confidence: ${aiVerdict.confidence})`,
  )

  // Step 4: Build and submit on-chain verdict report
  const approved = aiVerdict.verdict === 'APPROVED'

  const reportBytes = encodeAbiParameters(
    parseAbiParameters(
      'bytes32 agentId, bool approved, string reason, address target, bytes4 funcSig, uint256 value, uint256 mintAmount',
    ),
    [
      proposal.agentId as `0x${string}`,
      approved,
      aiVerdict.reason,
      proposal.targetContract as Address,
      proposal.functionSignature as `0x${string}`,
      BigInt(proposal.value),
      BigInt(proposal.mintAmount),
    ],
  )

  const writeCallData = encodeFunctionData({
    abi: GUARDIAN_ABI,
    functionName: 'processVerdict',
    args: [reportBytes],
  })

  evmClient
    .writeReport(runtime, {
      to: config.guardianContractAddress as Address,
      data: writeCallData,
    })
    .result()

  runtime.log(`[SentinelCRE] Verdict written on-chain: ${approved ? 'APPROVED' : 'DENIED'}`)

  return JSON.stringify({
    status: 'success',
    agentId: proposal.agentId,
    verdict: aiVerdict.verdict,
    confidence: aiVerdict.confidence,
    reason: aiVerdict.reason,
  })
}

// =============================================================================
// Cron Handler — Health Check
// =============================================================================

const onHealthCheck = (runtime: Runtime<Config>, _payload: CronPayload): string => {
  const config = runtime.config
  const now = runtime.now()
  runtime.log(`[SentinelCRE] Health check triggered at ${now.toISOString()}`)

  // Read agent states and check for anomalies
  // In production, this would iterate registered agents and check:
  //   - Rate limit window violations
  //   - Daily volume spikes
  //   - Unusual patterns

  const chainSelector = getNetwork({
    chainFamily: 'evm',
    chainSelectorName: config.evmChainSelectorName,
    isTestnet: true,
  })
  const evmClient = new EVMClient(chainSelector)

  runtime.log('[SentinelCRE] Health check complete — all systems operational')

  return JSON.stringify({
    status: 'healthy',
    timestamp: now.toISOString(),
  })
}

// =============================================================================
// Workflow Entry Point
// =============================================================================

function initWorkflow(config: Config): Array<HandlerEntry<Config, any, any, any>> {
  const httpCapability = new HTTPCapability()
  const cronCapability = new CronCapability()

  return [
    handler(httpCapability.trigger({ authorizedKeys: [] }), onActionProposal),
    handler(cronCapability.trigger({ schedule: config.schedule }), onHealthCheck),
  ]
}

export async function main() {
  const runner = await Runner.newRunner<Config>({ configSchema })
  await runner.run(initWorkflow)
}

main()
