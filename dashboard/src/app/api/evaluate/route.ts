import { NextResponse } from 'next/server'
import {
  createWalletClient,
  createPublicClient,
  http,
  encodeAbiParameters,
  parseAbiParameters,
  getAddress,
  type Hex,
} from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { sepolia } from 'viem/chains'
import { validateProposal } from '@/lib/validation'
import type { PolicyOverrides, LayerCatchInfo } from '@/lib/demo-scenarios'

export const dynamic = 'force-dynamic'

const MOCK_API =
  process.env.NEXT_PUBLIC_MOCK_API_URL ?? 'http://localhost:3002'

// On-chain verdict recording — sends real tx to Tenderly Virtual TestNet
const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL
const DEPLOYER_KEY = process.env.DEPLOYER_PRIVATE_KEY as Hex | undefined
const GUARDIAN_ADDRESS = process.env.NEXT_PUBLIC_GUARDIAN_ADDRESS as Hex | undefined

const PROCESS_VERDICT_ABI = [
  {
    name: 'processVerdict',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'reportData', type: 'bytes' }],
    outputs: [],
  },
  {
    name: 'unfreezeAgent',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'agentId', type: 'bytes32' }],
    outputs: [],
  },
] as const

async function submitVerdictOnChain(
  agentId: string,
  approved: boolean,
  reason: string,
  targetContract: string,
  functionSig: string,
  value: string,
  mintAmount: string,
) {
  if (!RPC_URL || !DEPLOYER_KEY || !GUARDIAN_ADDRESS) return

  try {
    const account = privateKeyToAccount(DEPLOYER_KEY)
    const walletClient = createWalletClient({
      account,
      chain: sepolia,
      transport: http(RPC_URL),
    })
    const publicClient = createPublicClient({
      chain: sepolia,
      transport: http(RPC_URL),
    })

    // Encode the verdict report data
    const fnSig = (functionSig || '0x00000000').slice(0, 10).padEnd(10, '0') as Hex
    const reportData = encodeAbiParameters(
      parseAbiParameters('bytes32, bool, string, address, bytes4, uint256, uint256'),
      [
        agentId as Hex,
        approved,
        reason.slice(0, 200),
        getAddress(targetContract || '0x000000000000000000000000000000000000AA01'),
        fnSig,
        BigInt(value || '0'),
        BigInt(mintAmount || '0'),
      ],
    )

    const hash = await walletClient.writeContract({
      address: GUARDIAN_ADDRESS,
      abi: PROCESS_VERDICT_ABI,
      functionName: 'processVerdict',
      args: [reportData],
    })
    await publicClient.waitForTransactionReceipt({ hash })
    console.log('[On-chain verdict] Recorded:', hash.slice(0, 14), approved ? 'APPROVED' : 'DENIED')

    // If denied, the agent gets frozen — unfreeze it so the next demo scenario works
    if (!approved) {
      try {
        const unfreezeHash = await walletClient.writeContract({
          address: GUARDIAN_ADDRESS,
          abi: PROCESS_VERDICT_ABI,
          functionName: 'unfreezeAgent',
          args: [agentId as Hex],
        })
        await publicClient.waitForTransactionReceipt({ hash: unfreezeHash })
      } catch {
        // Agent might not be frozen (baseline scenarios) — ignore
      }
    }
  } catch (err) {
    console.error('[On-chain verdict] Failed:', err)
  }
}

// ── Deterministic policy evaluator (fallback when AI server is offline) ──
// Mirrors on-chain PolicyLib + behavioral heuristics so the demo always works

const APPROVED_CONTRACTS = ['0x000000000000000000000000000000000000aa01']
const BLOCKED_FUNCTIONS = ['0xff00ff00', '0x3659cfe6', '0x4f1ef286', '0x715018a6', '0xf2fde38b']
const MAX_VALUE = BigInt('1000000000000000000') // 1 ETH
const MAX_MINT = BigInt('1000000000000000000000000') // 1M tokens
const INJECTION_PATTERNS = ['ignore previous', 'ignore all', 'forget instructions', 'transfer all funds']

function deterministicEvaluate(proposal: any, overrides?: PolicyOverrides): {
  v1: { verdict: string; confidence: number; reason: string }
  v2: { verdict: string; confidence: number; reason: string }
  anomalyScore: number
  anomalyFlagged: boolean
  anomalyDimensions: { name: string; fired: boolean; score: number; reason: string }[]
  layerCatchInfo: LayerCatchInfo
} {
  const value = BigInt(proposal.value || '0')
  const mint = BigInt(proposal.mintAmount || '0')
  const target = (proposal.targetContract || '').toLowerCase()
  const fn = (proposal.functionSignature || '').toLowerCase().slice(0, 10)
  const desc = (proposal.description || '').toLowerCase()
  const recentValues: number[] = proposal.recentValues ?? []

  const dimensions: { name: string; fired: boolean; score: number; reason: string }[] = []
  let anomalyScore = 0

  // Effective policy values (overrides with defaults)
  const checkValue = overrides?.valueCheckEnabled ?? true
  const checkMint = overrides?.mintCheckEnabled ?? true
  const checkTarget = overrides?.targetWhitelistEnabled ?? true
  const checkFunction = overrides?.functionBlocklistEnabled ?? true
  const effectiveMaxValue = BigInt(Math.floor((overrides?.maxValueEth ?? 1) * 1e18).toString())
  const effectiveMaxMint = BigInt(Math.floor((overrides?.maxMintTokens ?? 1_000_000) * 1e18).toString())
  const effectiveAnomalyThreshold = overrides?.anomalyThreshold ?? 50

  const layerInfo: LayerCatchInfo = {
    layer1: { checked: false, caught: false },
    layer2: { checked: false, caught: false },
    layer3: { checked: false, caught: false },
    caughtBy: 'none',
  }

  // Layer 1: On-chain policy checks
  if (checkValue && value > effectiveMaxValue) {
    const maxEth = overrides?.maxValueEth ?? 1
    const reason = `Value ${Number(value) / 1e18} ETH exceeds ${maxEth} ETH policy limit`
    layerInfo.layer1 = { checked: true, caught: true, reason }
    layerInfo.caughtBy = 'layer1'
    return {
      v1: { verdict: 'DENIED', confidence: 0, /* REDACTED */ reason },
      v2: { verdict: 'DENIED', confidence: 93, reason },
      anomalyScore: 0, anomalyFlagged: false, anomalyDimensions: [],
      layerCatchInfo: layerInfo,
    }
  }
  if (checkValue) layerInfo.layer1.checked = true

  if (checkMint && mint > effectiveMaxMint) {
    const maxTokens = (overrides?.maxMintTokens ?? 1_000_000).toLocaleString()
    const reason = `Mint amount exceeds ${maxTokens} token cap — infinite mint blocked`
    layerInfo.layer1 = { checked: true, caught: true, reason }
    layerInfo.caughtBy = 'layer1'
    return {
      v1: { verdict: 'DENIED', confidence: 0, /* REDACTED */ reason },
      v2: { verdict: 'DENIED', confidence: 0, /* REDACTED */ reason },
      anomalyScore: 0, anomalyFlagged: false, anomalyDimensions: [],
      layerCatchInfo: layerInfo,
    }
  }
  if (checkMint) layerInfo.layer1.checked = true

  if (checkTarget && !APPROVED_CONTRACTS.includes(target)) {
    const reason = `Target contract ${proposal.targetContract} not in approved whitelist`
    layerInfo.layer1 = { checked: true, caught: true, reason }
    layerInfo.caughtBy = 'layer1'
    return {
      v1: { verdict: 'DENIED', confidence: 0, /* REDACTED */ reason },
      v2: { verdict: 'DENIED', confidence: 0, /* REDACTED */ reason },
      anomalyScore: 0, anomalyFlagged: false, anomalyDimensions: [],
      layerCatchInfo: layerInfo,
    }
  }
  if (checkTarget) layerInfo.layer1.checked = true

  if (checkFunction && BLOCKED_FUNCTIONS.includes(fn)) {
    const reason = `Function ${fn} is explicitly blocked — proxy upgrade / admin function`
    layerInfo.layer1 = { checked: true, caught: true, reason }
    layerInfo.caughtBy = 'layer1'
    return {
      v1: { verdict: 'DENIED', confidence: 0, /* REDACTED */ reason },
      v2: { verdict: 'DENIED', confidence: 0, /* REDACTED */ reason },
      anomalyScore: 0, anomalyFlagged: false, anomalyDimensions: [],
      layerCatchInfo: layerInfo,
    }
  }
  if (checkFunction) layerInfo.layer1.checked = true

  // Layer 2: Behavioral risk scoring
  layerInfo.layer2.checked = true

  // Sequential probing: monotonically increasing recent values
  if (recentValues.length >= 2) {
    const isIncreasing = recentValues.every((v, i) => i === 0 || v > recentValues[i - 1])
    if (isIncreasing) {
      dimensions.push({ name: 'Sequential Probing', fired: true, score: 0, /* REDACTED */ reason: `${recentValues.length + 1} monotonically increasing values detected` })
      anomalyScore += 0 /* REDACTED */
    }
  }

  // Velocity burst: many rapid recent values
  if (recentValues.length >= 10) {
    const velocityScore = recentValues.length >= 15 ? 50 : 25
    dimensions.push({ name: 'Velocity', fired: true, score: velocityScore, reason: `${recentValues.length} rapid transactions — ${Math.round(recentValues.length / 3)}x above baseline interval` })
    anomalyScore += velocityScore
  }

  // Near-limit exploitation: mint amount close to cap (>80%)
  const effectiveMintCap80 = effectiveMaxMint * 80n / 100n
  if (mint > 0n && mint > effectiveMintCap80) {
    const pct = Number(mint * 100n / effectiveMaxMint)
    const nearLimitScore = pct >= 90 ? 50 : 30
    dimensions.push({ name: 'Function Pattern', fired: true, score: nearLimitScore, reason: `Mint ${pct}% of cap — near-limit exploitation detected` })
    anomalyScore += nearLimitScore
  }

  // Value deviation from recent pattern
  if (recentValues.length > 0) {
    const avg = recentValues.reduce((a, b) => a + b, 0) / recentValues.length
    const currentEth = Number(value) / 1e18
    if (currentEth > avg * 2 && avg > 0) {
      dimensions.push({ name: 'Value Deviation', fired: true, score: 0, /* REDACTED */ reason: `${currentEth.toFixed(1)} ETH is ${(currentEth / avg).toFixed(1)}x above moving average` })
      anomalyScore += 0 /* REDACTED */
    }
  }

  // Prompt injection detection
  if (INJECTION_PATTERNS.some(p => desc.includes(p))) {
    dimensions.push({ name: 'Prompt Injection', fired: true, score: 0, /* REDACTED */ reason: 'Injection pattern detected in action description' })
    anomalyScore += 0 /* REDACTED */
  }

  // Off-hours / emergency language heuristic
  const hasEmergency = desc.includes('emergency')
  const hasImmediately = desc.includes('immediately')
  if (hasEmergency || hasImmediately) {
    const urgencyScore = (hasEmergency && hasImmediately) ? 30 : 10
    dimensions.push({ name: 'Time-of-Day', fired: true, score: urgencyScore, reason: hasEmergency && hasImmediately ? 'EMERGENCY + IMMEDIATELY — high-confidence social engineering pattern' : 'Suspicious urgency language — potential off-hours exploitation' })
    anomalyScore += urgencyScore
  }

  // "Transfer all" language = fund extraction attempt
  if (desc.includes('transfer all')) {
    dimensions.push({ name: 'Value Deviation', fired: true, score: 0, /* REDACTED */ reason: 'Fund extraction language detected — "transfer all" pattern' })
    anomalyScore += 0 /* REDACTED */
  }

  // Cumulative drift: current value far above origin
  if (recentValues.length >= 5) {
    const origin = recentValues.slice(0, 3).reduce((a, b) => a + b, 0) / 3
    const currentEth = Number(value) / 1e18
    if (origin > 0 && currentEth > origin * 3) {
      dimensions.push({ name: 'Cumulative Drift', fired: true, score: 0, /* REDACTED */ reason: `Current ${currentEth.toFixed(1)} ETH is ${((currentEth / origin - 1) * 100).toFixed(0)}% above origin baseline` })
      anomalyScore += 0 /* REDACTED */
    }
  }

  const anomalyFlagged = anomalyScore >= effectiveAnomalyThreshold
  layerInfo.layer2 = { checked: true, caught: anomalyFlagged, score: anomalyScore, reason: anomalyFlagged ? `Score ${anomalyScore} >= threshold ${effectiveAnomalyThreshold}` : undefined }

  // Layer 3: Dual-AI consensus
  layerInfo.layer3.checked = true
  if (anomalyFlagged) {
    const reason = `Behavioral anomaly score ${anomalyScore}/100 — ${dimensions.filter(d => d.fired).map(d => d.name).join(' + ')}`
    layerInfo.layer3 = { checked: true, caught: true, reason }
    layerInfo.caughtBy = 'layer2'
    return {
      v1: { verdict: 'DENIED', confidence: 0, /* REDACTED */ reason },
      v2: { verdict: 'DENIED', confidence: 0, /* REDACTED */ reason },
      anomalyScore, anomalyFlagged, anomalyDimensions: dimensions,
      layerCatchInfo: layerInfo,
    }
  }

  // Passed all checks
  layerInfo.layer3 = { checked: true, caught: false }
  return {
    v1: { verdict: 'APPROVED', confidence: 0, /* REDACTED */ reason: 'Action within policy limits — value, target, function all compliant' },
    v2: { verdict: 'APPROVED', confidence: 0, /* REDACTED */ reason: 'No anomalies detected — behavioral profile normal' },
    anomalyScore, anomalyFlagged, anomalyDimensions: dimensions,
    layerCatchInfo: layerInfo,
  }
}

export async function POST(request: Request) {
  try {
    const { proposal, policyOverrides } = await request.json()

    const validationError = validateProposal(proposal)
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 })
    }

    // Step 1: Behavioral analysis (Layer 2)
    let behavioral: any = null
    try {
      const behavioralRes = await fetch(`${MOCK_API}/behavioral/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentId: proposal.agentId,
          targetContract: proposal.targetContract,
          functionSignature: proposal.functionSignature,
          value: proposal.value,
          mintAmount: proposal.mintAmount,
          recentValues: proposal.recentValues,
        }),
      })
      behavioral = await behavioralRes.json()
    } catch {
      // Behavioral analysis is non-blocking — proceed without it
    }

    // Step 2: Try AI model evaluation, fall back to deterministic if unavailable
    let v1: { verdict: string; confidence: number; reason: string }
    let v2: { verdict: string; confidence: number; reason: string }
    let usedFallback = false

    // Always compute layer catch info for the defense-in-depth visualization
    const policyAnalysis = deterministicEvaluate(proposal, policyOverrides)
    const layerCatchInfo = policyAnalysis.layerCatchInfo

    try {
      const safeDescription = (proposal.description ?? '').replace(/[\x00-\x1f\x7f]/g, '').slice(0, 500)

      let prompt = `You are a security sentinel evaluating an AI agent's proposed on-chain action.

PROPOSED ACTION:
- Agent ID: ${proposal.agentId}
- Target Contract: ${proposal.targetContract}
- Function: ${proposal.functionSignature}
- Value (wei): ${proposal.value}
- Mint Amount: ${proposal.mintAmount}
- Description: ${safeDescription}`

      if (behavioral) {
        prompt += `

BEHAVIORAL RISK ANALYSIS (Layer 2):
- Anomaly Score: ${behavioral.totalScore}/100 (threshold: ${behavioral.threshold})
- Status: ${behavioral.flagged ? 'FLAGGED — behavioral anomaly detected' : 'NORMAL'}`
        for (const dim of behavioral.dimensions ?? []) {
          prompt += `\n  - ${dim.name}: ${dim.fired ? `+${dim.score}` : '0'} — ${dim.reason}`
        }
        if (behavioral.flagged) {
          prompt += `\n\nThe behavioral risk engine has FLAGGED this action. Weight this strongly in your verdict.`
        }
      }

      prompt += `

Respond with ONLY valid JSON:
{"verdict":"APPROVED" or "DENIED","confidence":0-100,"reason":"brief explanation"}`

      const body = JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 300,
        temperature: 0,
        messages: [{ role: 'user', content: prompt }],
      })

      const [res1, res2] = await Promise.all([
        fetch(`${MOCK_API}/evaluate/model1`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body,
        }),
        fetch(`${MOCK_API}/evaluate/model2`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body,
        }),
      ])

      const r1 = await res1.json()
      const r2 = await res2.json()

      v1 = JSON.parse((r1 as any).content[0].text)
      v2 = JSON.parse((r2 as any).content[0].text)
    } catch {
      // AI server unavailable — use deterministic policy evaluation
      console.log('[evaluate] AI server offline — using deterministic fallback')
      v1 = policyAnalysis.v1
      v2 = policyAnalysis.v2
      usedFallback = true

      // Use fallback behavioral data if server was also unavailable
      if (!behavioral) {
        behavioral = {
          totalScore: policyAnalysis.anomalyScore,
          threshold: policyOverrides?.anomalyThreshold ?? 50,
          flagged: policyAnalysis.anomalyFlagged,
          dimensions: policyAnalysis.anomalyDimensions,
        }
      }
    }

    const consensus =
      v1.verdict === 'APPROVED' && v2.verdict === 'APPROVED'
        ? 'APPROVED'
        : 'DENIED'

    // Step 3: Update behavioral profile (non-blocking)
    try {
      await fetch(`${MOCK_API}/behavioral/update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentId: proposal.agentId,
          proposal,
          verdict: consensus,
        }),
      })
    } catch {
      // Non-blocking
    }

    // Step 4: Submit verdict on-chain to SentinelGuardian (Tenderly Virtual TestNet)
    await submitVerdictOnChain(
      proposal.agentId,
      consensus === 'APPROVED',
      v1.reason,
      proposal.targetContract,
      proposal.functionSignature,
      proposal.value,
      proposal.mintAmount,
    )

    // Compute severity for denied verdicts
    let severity: 'LOW' | 'MEDIUM' | 'CRITICAL' | undefined
    let challengeWindowExpiry: number | undefined
    if (consensus === 'DENIED') {
      const value = BigInt(proposal.value || '0')
      const maxValue = BigInt('1000000000000000000') // 1 ETH
      const mint = BigInt(proposal.mintAmount || '0')
      const maxMint = BigInt('1000000000000000000000000') // 1M tokens

      if (
        (maxValue > 0n && value > maxValue * 10n) ||
        (maxMint > 0n && mint > maxMint * 100n)
      ) {
        severity = 'CRITICAL'
      } else if (
        (maxValue > 0n && value > maxValue * 2n) ||
        (behavioral?.flagged && behavioral?.totalScore >= 60)
      ) {
        severity = 'MEDIUM'
        challengeWindowExpiry = Date.now() + 1800 * 1000
      } else {
        severity = 'LOW'
        challengeWindowExpiry = Date.now() + 3600 * 1000
      }
    }

    return NextResponse.json({
      model1: v1,
      model2: v2,
      consensus,
      proposal,
      timestamp: Date.now(),
      severity,
      challengeWindowExpiry,
      challengeStatus: severity && severity !== 'CRITICAL' ? 'PENDING' : undefined,
      anomalyScore: behavioral?.totalScore ?? null,
      anomalyFlagged: behavioral?.flagged ?? false,
      anomalyDimensions: behavioral?.dimensions ?? null,
      fallback: usedFallback || undefined,
      layerCatchInfo,
    })
  } catch (err) {
    console.error('[evaluate] Internal error:', err)
    // Last resort — should rarely hit this now that AI eval has its own try/catch
    return NextResponse.json(
      {
        model1: { verdict: 'DENIED', confidence: 0, reason: 'Internal evaluation error' },
        model2: { verdict: 'DENIED', confidence: 0, reason: 'Internal evaluation error' },
        consensus: 'DENIED',
        proposal: null,
        timestamp: Date.now(),
        error: 'Evaluation service unavailable',
      },
      { status: 502 },
    )
  }
}
