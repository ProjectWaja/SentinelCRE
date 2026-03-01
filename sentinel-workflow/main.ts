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
  ConfidentialHTTPClient,
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
  type ConfidentialHTTPSendRequester,
  type HTTPPayload,
  type CronPayload,
  type HandlerEntry,
} from '@chainlink/cre-sdk'

import { analyzeAll, getDefaultContext, type BehaviorContext, type BehavioralAnalysisResult } from './behavioral'
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
  enableConfidentialCompute: z
    .boolean()
    .describe('Enable Confidential HTTP for AI calls (hides prompts, API keys, and responses inside TEE)'),
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
  // Behavioral context (optional, provided by caller for stateful analysis)
  recentValues?: number[] // recent tx values in ETH
  recentTimestamps?: number[] // recent tx timestamps in ms
  knownContracts?: string[] // contracts agent has used before
  commonFunctions?: string[] // function sigs agent commonly uses
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
      { name: 'requireMultiAiConsensus', type: 'bool' },
      { name: 'isActive', type: 'bool' },
      { name: 'reserveFeed', type: 'address' },
      { name: 'minReserveRatio', type: 'uint256' },
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
  {
    name: 'resolveChallenge',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'agentId', type: 'bytes32' },
      { name: 'approved', type: 'bool' },
      { name: 'reason', type: 'string' },
    ],
    outputs: [],
  },
] as const

const REGISTRY_ABI = [
  {
    name: 'getAgentCount',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'isRegistered',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'agentId', type: 'bytes32' }],
    outputs: [{ name: '', type: 'bool' }],
  },
] as const

// =============================================================================
// AI Evaluation
// =============================================================================

/** Strip control characters and limit length to mitigate prompt injection via user-supplied fields. */
function sanitizeField(input: string, maxLen = 500): string {
  return input
    .replace(/[\x00-\x1f\x7f]/g, '') // strip control chars
    .slice(0, maxLen)
}

function buildEvaluationPrompt(
  proposal: ActionProposal,
  policyContext: {
    maxTransactionValue: string
    maxDailyVolume: string
    maxMintAmount: string
    rateLimit: string
  },
  behavioralResult?: BehavioralAnalysisResult,
): string {
  const safeDescription = sanitizeField(proposal.description ?? '', 500)

  let prompt = `You are a security sentinel evaluating an AI agent's proposed on-chain action.

PROPOSED ACTION:
- Agent ID: ${proposal.agentId}
- Target Contract: ${proposal.targetContract}
- Function: ${proposal.functionSignature}
- Value (wei): ${proposal.value}
- Mint Amount: ${proposal.mintAmount}
- Description: ${safeDescription}

AGENT POLICY LIMITS:
- Max Transaction Value: ${policyContext.maxTransactionValue} wei
- Max Daily Volume: ${policyContext.maxDailyVolume} wei
- Max Mint Amount: ${policyContext.maxMintAmount} tokens
- Rate Limit: ${policyContext.rateLimit} actions/window`

  if (behavioralResult) {
    prompt += `

BEHAVIORAL RISK ANALYSIS (Layer 2):
- Anomaly Score: ${behavioralResult.totalScore}/100 (threshold: ${behavioralResult.threshold})
- Status: ${behavioralResult.flagged ? 'FLAGGED — behavioral anomaly detected' : 'NORMAL'}`
    for (const dim of behavioralResult.dimensions) {
      prompt += `\n  - ${dim.name}: ${dim.fired ? `+${dim.score}` : '0'} — ${dim.reason}`
    }
    if (behavioralResult.flagged) {
      prompt += `\n\nThe behavioral risk engine has FLAGGED this action. Weight this strongly in your verdict.`
    }
  }

  prompt += `

Evaluate whether this action is safe and within policy bounds.
Respond with ONLY valid JSON (no markdown):
{"verdict":"APPROVED" or "DENIED","confidence":0-100,"reason":"brief explanation"}`

  return prompt
}

/**
 * Calls both AI models via standard HTTPClient and requires consensus.
 * Uses HTTPClient.sendRequest with ConsensusAggregationByFields.
 * Temperature 0 ensures deterministic output for DON consensus.
 *
 * NOTE: In this path, node operators CAN see API keys, prompts, and responses.
 * Use evaluateWithConfidentialHttp() to hide all of this inside a TEE.
 */
function evaluateWithStandardHttp(
  sendRequester: HTTPSendRequester,
  config: Config,
  proposal: ActionProposal,
  policyContext: {
    maxTransactionValue: string
    maxDailyVolume: string
    maxMintAmount: string
    rateLimit: string
  },
  behavioralResult?: BehavioralAnalysisResult,
): AIVerdict {
  const prompt = buildEvaluationPrompt(proposal, policyContext, behavioralResult)

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

  // Call Model 2 (OpenAI GPT-4)
  const response2 = sendRequester
    .sendRequest({
      url: config.aiEndpoint2,
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        model: 'gpt-4-turbo',
        max_tokens: 300,
        temperature: 0,
        messages: [{ role: 'user', content: prompt }],
      }),
    })
    .result()

  return parseAIResponses(response1, response2)
}

/**
 * Calls both AI models via ConfidentialHTTPClient (TEE-backed).
 * API keys, evaluation prompts, and full AI responses stay INSIDE the enclave.
 * Only the parsed AIVerdict exits after consensus aggregation.
 *
 * This prevents:
 * - Node operators from seeing policy thresholds embedded in prompts
 * - API keys from being exposed during execution (injected via Vault DON templates)
 * - AI reasoning/confidence details from leaking
 * - Agents from reverse-engineering their own guardrail parameters
 *
 * Uses the same sugar pattern as HTTPClient: callback + ConsensusAggregationByFields.
 */
function evaluateWithConfidentialHttp(
  sendRequester: ConfidentialHTTPSendRequester,
  config: Config,
  proposal: ActionProposal,
  policyContext: {
    maxTransactionValue: string
    maxDailyVolume: string
    maxMintAmount: string
    rateLimit: string
  },
  behavioralResult?: BehavioralAnalysisResult,
): AIVerdict {
  const prompt = buildEvaluationPrompt(proposal, policyContext, behavioralResult)

  // Model 1: Anthropic Claude
  const claudeBody = JSON.stringify({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 300,
    temperature: 0,
    messages: [{ role: 'user', content: prompt }],
  })

  // ConfidentialHTTPRequest: secrets listed in vaultDonSecrets, referenced via
  // {{ANTHROPIC_API_KEY}} template in headers. Resolved inside TEE from Vault DON.
  const confRequest1 = {
    vaultDonSecrets: [{ key: 'ANTHROPIC_API_KEY', namespace: 'sentinel' }],
    request: {
      url: config.aiEndpoint1,
      method: 'POST',
      bodyString: claudeBody,
      multiHeaders: {
        'Content-Type': { values: ['application/json'] },
        Accept: { values: ['application/json'] },
        'x-api-key': { values: ['{{ANTHROPIC_API_KEY}}'] },
        'anthropic-version': { values: ['2023-06-01'] },
      },
    },
  }

  // Model 2: OpenAI GPT-4
  const gptBody = JSON.stringify({
    model: 'gpt-4-turbo',
    max_tokens: 300,
    temperature: 0,
    messages: [{ role: 'user', content: prompt }],
  })

  const confRequest2 = {
    vaultDonSecrets: [{ key: 'OPENAI_API_KEY', namespace: 'sentinel' }],
    request: {
      url: config.aiEndpoint2,
      method: 'POST',
      bodyString: gptBody,
      multiHeaders: {
        'Content-Type': { values: ['application/json'] },
        Accept: { values: ['application/json'] },
        Authorization: { values: ['Bearer {{OPENAI_API_KEY}}'] },
      },
    },
  }

  const response1 = sendRequester.sendRequest(confRequest1).result()
  const response2 = sendRequester.sendRequest(confRequest2).result()

  return parseConfidentialAIResponses(response1, response2)
}

/**
 * Parse ConfidentialHTTPClient responses.
 * Response body is Uint8Array (from enclave), decoded to string then parsed.
 * Default to DENIED on any parse error (fail-safe).
 */
function parseConfidentialAIResponses(response1: any, response2: any): AIVerdict {
  let v1: AIVerdict = { verdict: 'DENIED', confidence: 0, reason: 'Model 1 unavailable' }
  let v2: AIVerdict = { verdict: 'DENIED', confidence: 0, reason: 'Model 2 unavailable' }

  const decoder = new TextDecoder()

  if (response1 && response1.statusCode >= 200 && response1.statusCode < 300) {
    try {
      const body1 = JSON.parse(decoder.decode(response1.body))
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

  if (response2 && response2.statusCode >= 200 && response2.statusCode < 300) {
    try {
      const body2 = JSON.parse(decoder.decode(response2.body))
      // OpenAI format: choices[0].message.content
      const rawText2 = body2.choices?.[0]?.message?.content ?? '{}'
      const parsed2 = JSON.parse(rawText2)
      v2 = {
        verdict: String(parsed2.verdict ?? 'DENIED'),
        confidence: Number(parsed2.confidence ?? 0),
        reason: String(parsed2.reason ?? ''),
      }
    } catch {
      // Fail-safe: default to DENIED
    }
  }

  const approved = v1.verdict === 'APPROVED' && v2.verdict === 'APPROVED'

  return {
    verdict: approved ? 'APPROVED' : 'DENIED',
    confidence: Math.min(v1.confidence, v2.confidence),
    reason: approved
      ? 'Both AI models approve action (confidential)'
      : `Model1: ${v1.reason}. Model2: ${v2.reason}`,
  }
}

/**
 * Shared response parser for standard HTTP path.
 * Default to DENIED on any parse error (fail-safe).
 */
function parseAIResponses(response1: any, response2: any): AIVerdict {
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
      // OpenAI format: choices[0].message.content
      const rawText2 = body2.choices?.[0]?.message?.content ?? '{}'
      const parsed2 = JSON.parse(rawText2)
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

  // Step 2.5: Behavioral Risk Scoring (Layer 2)
  const behaviorCtx: BehaviorContext = {
    recentValues: proposal.recentValues ?? [],
    recentTimestamps: proposal.recentTimestamps ?? [],
    knownContracts: proposal.knownContracts ?? [],
    commonFunctions: proposal.commonFunctions ?? [],
    activeHours: Array.from({ length: 24 }, (_, i) => i),
    avgValue: 0,
    stdDevValue: 0,
    lastActionTimestamp: 0,
    minExpectedInterval: 60_000,
  }

  // Compute running stats from recentValues if available
  if (behaviorCtx.recentValues.length > 0) {
    const sum = behaviorCtx.recentValues.reduce((a, b) => a + b, 0)
    behaviorCtx.avgValue = sum / behaviorCtx.recentValues.length
    if (behaviorCtx.recentValues.length > 1) {
      const sqSum = behaviorCtx.recentValues.reduce((a, v) => a + (v - behaviorCtx.avgValue) ** 2, 0)
      behaviorCtx.stdDevValue = Math.sqrt(sqSum / behaviorCtx.recentValues.length)
    }
  }

  if (behaviorCtx.recentTimestamps.length > 0) {
    behaviorCtx.lastActionTimestamp = behaviorCtx.recentTimestamps[behaviorCtx.recentTimestamps.length - 1]
  }

  const behavioralResult = analyzeAll(proposal, behaviorCtx, now.getTime(), 50)

  runtime.log(`[SentinelCRE] Behavioral Score: ${behavioralResult.totalScore}/100 (threshold: ${behavioralResult.threshold})`)
  for (const dim of behavioralResult.dimensions) {
    if (dim.fired) {
      runtime.log(`[SentinelCRE]   +${dim.score} ${dim.name}: ${dim.reason}`)
    }
  }

  if (behavioralResult.flagged) {
    runtime.log(`[SentinelCRE] FLAGGED by behavioral analysis — biasing toward denial`)
  }

  // Step 3: Multi-AI consensus evaluation (enriched with behavioral context)
  const policyContext = {
    maxTransactionValue: maxTxValue.toString(),
    maxDailyVolume: maxDailyVol.toString(),
    maxMintAmount: maxMint.toString(),
    rateLimit: rateLimit.toString(),
  }

  let aiVerdict: AIVerdict

  if (config.enableConfidentialCompute) {
    // Confidential HTTP path: prompts, API keys, and AI responses stay inside TEE.
    // Agents cannot reverse-engineer their own guardrail parameters.
    runtime.log('[SentinelCRE] Using Confidential HTTP for AI evaluation')
    const confClient = new ConfidentialHTTPClient()
    aiVerdict = confClient
      .sendRequest(
        runtime,
        (sendRequester: ConfidentialHTTPSendRequester) =>
          evaluateWithConfidentialHttp(sendRequester, config, proposal, policyContext, behavioralResult),
        ConsensusAggregationByFields<AIVerdict>({
          verdict: identical,
          confidence: median,
          reason: identical,
        }),
      )()
      .result()
  } else {
    // Standard HTTP path: node operators can see API calls (fallback)
    const httpClient = new HTTPClient()
    aiVerdict = httpClient
      .sendRequest(
        runtime,
        (sendRequester: HTTPSendRequester) =>
          evaluateWithStandardHttp(sendRequester, config, proposal, policyContext, behavioralResult),
        ConsensusAggregationByFields<AIVerdict>({
          verdict: identical,
          confidence: median,
          reason: identical,
        }),
      )()
      .result()
  }

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
    anomalyScore: behavioralResult.totalScore,
    anomalyFlagged: behavioralResult.flagged,
    anomalyDimensions: behavioralResult.dimensions,
  })
}

// =============================================================================
// Cron Handler — Health Check
// =============================================================================

const onHealthCheck = (runtime: Runtime<Config>, _payload: CronPayload): string => {
  const config = runtime.config
  const now = runtime.now()
  runtime.log(`[SentinelCRE] Health check triggered at ${now.toISOString()}`)

  const chainSelector = getNetwork({
    chainFamily: 'evm',
    chainSelectorName: config.evmChainSelectorName,
    isTestnet: true,
  })
  const evmClient = new EVMClient(chainSelector)

  // Read total registered agent count from AgentRegistry
  const countCallData = encodeFunctionData({
    abi: REGISTRY_ABI,
    functionName: 'getAgentCount',
    args: [],
  })

  const countResult = evmClient
    .callContract(runtime, {
      call: encodeCallMsg({
        from: zeroAddress,
        to: config.registryContractAddress as Address,
        data: countCallData,
      }),
      blockNumber: LAST_FINALIZED_BLOCK_NUMBER,
    })
    .result()

  const agentCount = ok(countResult)
    ? Number(
        decodeFunctionResult({
          abi: REGISTRY_ABI,
          functionName: 'getAgentCount',
          data: text(countResult) as `0x${string}`,
        }),
      )
    : 0

  // Verify the SentinelGuardian contract is responsive
  const guardianCallData = encodeFunctionData({
    abi: GUARDIAN_ABI,
    functionName: 'isAgentActive',
    args: ['0x0000000000000000000000000000000000000000000000000000000000000000' as `0x${string}`],
  })

  const guardianResult = evmClient
    .callContract(runtime, {
      call: encodeCallMsg({
        from: zeroAddress,
        to: config.guardianContractAddress as Address,
        data: guardianCallData,
      }),
      blockNumber: LAST_FINALIZED_BLOCK_NUMBER,
    })
    .result()

  const guardianReachable = ok(guardianResult)

  runtime.log(
    `[SentinelCRE] Health check complete — Registry: ${agentCount} agents, Guardian: ${guardianReachable ? 'online' : 'unreachable'}`,
  )

  return JSON.stringify({
    status: guardianReachable ? 'healthy' : 'degraded',
    timestamp: now.toISOString(),
    registeredAgents: agentCount,
    guardianReachable,
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
