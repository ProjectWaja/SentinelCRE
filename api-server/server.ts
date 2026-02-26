/**
 * SentinelCRE — Mock AI Evaluation Server
 *
 * Deterministic AI evaluation endpoints for CRE workflow simulation.
 * Same input always produces same output (required for DON consensus).
 *
 * Endpoints:
 *   POST /evaluate/model1        — Mock Claude evaluation
 *   POST /evaluate/model2        — Mock second model evaluation
 *   POST /challenge/evaluate     — Challenge re-evaluation (lenient)
 *   POST /behavioral/analyze     — Compute anomaly scores for a proposal
 *   POST /behavioral/update      — Update profile after verdict
 *   GET  /behavioral/profile/:id — Get agent behavior profile
 *   DELETE /behavioral/reset     — Reset all behavior profiles
 *   GET  /health                 — Server health check
 *
 * Usage: bun run api-server/server.ts
 */

const PORT = Number(process.env.MOCK_API_PORT ?? 3002)

// ── Behavioral Profile Store ─────────────────────────────────────────

interface BehaviorProfile {
  avgValue: number
  stdDevValue: number
  knownContracts: string[]
  commonFunctions: string[]
  minExpectedInterval: number
  activeHours: number[]
  recentValues: number[]
  lastActionTimestamp: number
  actionCount: number
  valueSum: number
  valueSumSquares: number
  /** Frozen origin baseline — set after first N actions, never updated */
  originAvgValue: number
  originStdDevValue: number
  originFrozen: boolean
  /** How many actions to observe before freezing origin */
  originWindowSize: number
}

const agentProfiles = new Map<string, BehaviorProfile>()

function getOrCreateProfile(agentId: string): BehaviorProfile {
  if (!agentProfiles.has(agentId)) {
    agentProfiles.set(agentId, {
      avgValue: 0,
      stdDevValue: 0,
      knownContracts: [],
      commonFunctions: [],
      minExpectedInterval: 60_000,
      activeHours: [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20], // Business hours UTC
      recentValues: [],
      lastActionTimestamp: 0,
      actionCount: 0,
      valueSum: 0,
      valueSumSquares: 0,
      originAvgValue: 0,
      originStdDevValue: 0,
      originFrozen: false,
      originWindowSize: 5,
    })
  }
  return agentProfiles.get(agentId)!
}

interface AnomalyDim {
  name: string
  score: number
  maxWeight: number
  fired: boolean
  reason: string
}

function computeBehavioralAnalysis(
  agentId: string,
  targetContract: string,
  functionSig: string,
  valueWei: string,
  recentValuesOverride?: number[],
  mintAmountWei?: string,
): { totalScore: number; threshold: number; flagged: boolean; dimensions: AnomalyDim[] } {
  const profile = getOrCreateProfile(agentId)
  const ethValue = Number(BigInt(valueWei || '0')) / 1e18
  // For mint-focused agents (value=0), use mint amount as the behavioral value signal
  const mintTokens = Number(BigInt(mintAmountWei || '0')) / 1e18
  const currentValue = ethValue > 0 ? ethValue : mintTokens > 0 ? mintTokens : 0
  const threshold = 50
  const dims: AnomalyDim[] = []

  // Dim 1: Value Deviation (+25)
  // Zero-value txs (approvals, admin ops) skip deviation — they're common DeFi operations
  if (profile.avgValue === 0 && profile.stdDevValue === 0) {
    dims.push({ name: 'Value Deviation', score: 0, maxWeight: 25, fired: false, reason: 'No baseline — first action' })
  } else if (currentValue === 0 && profile.avgValue > 0) {
    dims.push({ name: 'Value Deviation', score: 0, maxWeight: 25, fired: false, reason: 'Zero-value operation (approval/admin) — not anomalous' })
  } else {
    const sd = profile.stdDevValue > 0 ? profile.stdDevValue : profile.avgValue * 0.25
    const z = sd > 0 ? Math.abs(currentValue - profile.avgValue) / sd : 0
    if (z > 2.5) {
      dims.push({ name: 'Value Deviation', score: 25, maxWeight: 25, fired: true, reason: `Value ${currentValue.toFixed(2)} ETH is ${z.toFixed(1)}σ from mean ${profile.avgValue.toFixed(2)} ETH` })
    } else if (z > 1.5) {
      dims.push({ name: 'Value Deviation', score: 12, maxWeight: 25, fired: true, reason: `Value ${currentValue.toFixed(2)} ETH is ${z.toFixed(1)}σ from mean (elevated)` })
    } else {
      dims.push({ name: 'Value Deviation', score: 0, maxWeight: 25, fired: false, reason: `Value within normal range (${z.toFixed(1)}σ)` })
    }
  }

  // Dim 2: Contract Diversity (+20)
  const target = targetContract.toLowerCase()
  if (profile.knownContracts.length === 0) {
    dims.push({ name: 'Contract Diversity', score: 10, maxWeight: 20, fired: true, reason: 'New agent — no contract history yet' })
  } else if (!profile.knownContracts.includes(target)) {
    dims.push({ name: 'Contract Diversity', score: 20, maxWeight: 20, fired: true, reason: `First interaction with ${target.slice(0, 10)}...` })
  } else {
    dims.push({ name: 'Contract Diversity', score: 0, maxWeight: 20, fired: false, reason: 'Known contract' })
  }

  // Dim 3: Velocity (+15) — use timestamps, default to safe
  const now = Date.now()
  if (profile.lastActionTimestamp === 0) {
    dims.push({ name: 'Velocity', score: 0, maxWeight: 15, fired: false, reason: 'First action — no interval' })
  } else {
    const interval = now - profile.lastActionTimestamp
    if (interval < profile.minExpectedInterval * 0.5) {
      dims.push({ name: 'Velocity', score: 15, maxWeight: 15, fired: true, reason: `Action ${(interval / 1000).toFixed(1)}s after previous` })
    } else if (interval < profile.minExpectedInterval * 0.75) {
      dims.push({ name: 'Velocity', score: 8, maxWeight: 15, fired: true, reason: `Interval elevated (${(interval / 1000).toFixed(1)}s)` })
    } else {
      dims.push({ name: 'Velocity', score: 0, maxWeight: 15, fired: false, reason: 'Normal interval' })
    }
  }

  // Dim 4: Function Pattern (+30)
  // Common DeFi functions (swap, approve, transfer, mint) are never unusual
  const sig = functionSig.toLowerCase()
  const COMMON_DEFI_FUNCTIONS = ['0x38ed1739', '0x095ea7b3', '0xa9059cbb', '0x40c10f19', '0x23b872dd']
  const isCommonDefi = COMMON_DEFI_FUNCTIONS.includes(sig)
  if (profile.commonFunctions.length === 0) {
    dims.push({ name: 'Function Pattern', score: 0, maxWeight: 30, fired: false, reason: 'New agent — no function history' })
  } else if (!profile.commonFunctions.includes(sig) && !isCommonDefi) {
    dims.push({ name: 'Function Pattern', score: 30, maxWeight: 30, fired: true, reason: `Unusual function ${functionSig}` })
  } else {
    dims.push({ name: 'Function Pattern', score: 0, maxWeight: 30, fired: false, reason: isCommonDefi ? 'Standard DeFi function' : 'Known function' })
  }

  // Dim 5: Time-of-Day (+10)
  const hour = new Date().getUTCHours()
  if (profile.activeHours.length === 24 || profile.activeHours.includes(hour)) {
    dims.push({ name: 'Time-of-Day', score: 0, maxWeight: 10, fired: false, reason: 'Within active hours' })
  } else {
    dims.push({ name: 'Time-of-Day', score: 10, maxWeight: 10, fired: true, reason: `Action at ${hour}:00 UTC outside normal window` })
  }

  // Dim 6: Sequential Probing (+35) — the hero
  const vals = [...(recentValuesOverride ?? profile.recentValues), currentValue]
  if (vals.length < 2) {
    dims.push({ name: 'Sequential Probing', score: 0, maxWeight: 35, fired: false, reason: 'Insufficient history' })
  } else if (vals.length === 2) {
    if (vals[1] > vals[0]) {
      dims.push({ name: 'Sequential Probing', score: 15, maxWeight: 35, fired: true, reason: `Two increasing: [${vals.map((v) => v.toFixed(1)).join(', ')}] — monitoring` })
    } else {
      dims.push({ name: 'Sequential Probing', score: 0, maxWeight: 35, fired: false, reason: 'No escalation' })
    }
  } else {
    const w = vals.slice(-Math.min(vals.length, 5))
    let mono = true
    for (let i = 1; i < w.length; i++) {
      if (w[i] <= w[i - 1]) { mono = false; break }
    }
    if (mono && w.length >= 3) {
      const ratios = []
      let geo = true
      for (let i = 1; i < w.length; i++) {
        const r = w[i] / w[i - 1]
        ratios.push(r)
        if (r < 1.5 || r > 3.0) geo = false
      }
      const vStr = w.map((v) => v.toFixed(1)).join(', ')
      const reason = geo
        ? `Binary search: [${vStr}] (ratios: ${ratios.map((r) => r.toFixed(1)).join(', ')})`
        : `Monotonically increasing: [${vStr}] — probing detected`
      dims.push({ name: 'Sequential Probing', score: 35, maxWeight: 35, fired: true, reason })
    } else {
      dims.push({ name: 'Sequential Probing', score: 0, maxWeight: 35, fired: false, reason: 'No sequential pattern' })
    }
  }

  // Dim 7: Cumulative Drift (+20) — the "boiling frog" defense
  if (!profile.originFrozen || profile.originAvgValue === 0) {
    dims.push({ name: 'Cumulative Drift', score: 0, maxWeight: 20, fired: false, reason: 'Origin baseline not yet established' })
  } else {
    const osd = profile.originStdDevValue > 0 ? profile.originStdDevValue : profile.originAvgValue * 0.25
    const drift = Math.abs(profile.avgValue - profile.originAvgValue)
    const driftRatio = osd > 0 ? drift / osd : 0
    const pctDrift = profile.originAvgValue > 0 ? ((profile.avgValue - profile.originAvgValue) / profile.originAvgValue) * 100 : 0
    const sign = pctDrift > 0 ? '+' : ''
    if (driftRatio > 3.0) {
      dims.push({ name: 'Cumulative Drift', score: 20, maxWeight: 20, fired: true, reason: `Rolling avg ${profile.avgValue.toFixed(2)} ETH drifted ${driftRatio.toFixed(1)}σ from origin ${profile.originAvgValue.toFixed(2)} ETH (${sign}${pctDrift.toFixed(0)}%)` })
    } else if (driftRatio > 2.0) {
      dims.push({ name: 'Cumulative Drift', score: 10, maxWeight: 20, fired: true, reason: `Gradual drift: avg ${profile.avgValue.toFixed(2)} ETH vs origin ${profile.originAvgValue.toFixed(2)} ETH (${sign}${pctDrift.toFixed(0)}%)` })
    } else {
      dims.push({ name: 'Cumulative Drift', score: 0, maxWeight: 20, fired: false, reason: `Stable — avg near origin ${profile.originAvgValue.toFixed(2)} ETH` })
    }
  }

  const totalScore = dims.reduce((s, d) => s + d.score, 0)
  return { totalScore, threshold, flagged: totalScore >= threshold, dimensions: dims }
}

function updateProfile(agentId: string, target: string, funcSig: string, valueWei: string, mintAmountWei?: string) {
  const profile = getOrCreateProfile(agentId)
  const rawEth = Number(BigInt(valueWei || '0')) / 1e18
  const mintTokens = Number(BigInt(mintAmountWei || '0')) / 1e18
  const ethValue = rawEth > 0 ? rawEth : mintTokens > 0 ? mintTokens : 0

  profile.actionCount++
  profile.valueSum += ethValue
  profile.valueSumSquares += ethValue * ethValue
  profile.avgValue = profile.valueSum / profile.actionCount
  profile.stdDevValue = profile.actionCount > 1
    ? Math.sqrt((profile.valueSumSquares / profile.actionCount) - profile.avgValue ** 2)
    : 0
  profile.recentValues.push(ethValue)
  if (profile.recentValues.length > 10) profile.recentValues.shift()
  profile.lastActionTimestamp = Date.now()

  // Freeze origin baseline after N actions — never updated after this
  if (!profile.originFrozen && profile.actionCount >= profile.originWindowSize) {
    profile.originAvgValue = profile.avgValue
    profile.originStdDevValue = profile.stdDevValue
    profile.originFrozen = true
  }

  const lTarget = target.toLowerCase()
  if (!profile.knownContracts.includes(lTarget)) profile.knownContracts.push(lTarget)

  const lSig = funcSig.toLowerCase()
  if (!profile.commonFunctions.includes(lSig)) profile.commonFunctions.push(lSig)
}

// Thresholds for rogue detection (matches the default policy in tests)
const ROGUE_THRESHOLDS = {
  maxValueWei: BigInt('1000000000000000000'), // 1 ETH
  maxMintAmount: BigInt('1000000000000000000000000'), // 1M tokens (1e24)
  approvedContracts: ['0x000000000000000000000000000000000000aa01'],
  blockedFunctions: ['0xff00ff00', '0x3659cfe6', '0x4f1ef286', '0x715018a6', '0xf2fde38b'],
}

interface EvalRequest {
  model?: string
  max_tokens?: number
  temperature?: number
  messages?: Array<{ role: string; content: string }>
}

interface EvalResponse {
  verdict: 'APPROVED' | 'DENIED'
  confidence: number
  reason: string
}

function evaluateAction(prompt: string): EvalResponse {
  const lower = prompt.toLowerCase()

  // Check for value violations
  const valueMatch = prompt.match(/Value \(wei\):\s*(\d+)/i)
  if (valueMatch) {
    const value = BigInt(valueMatch[1])
    if (value > ROGUE_THRESHOLDS.maxValueWei) {
      return {
        verdict: 'DENIED',
        confidence: 98,
        reason: `Transaction value ${value} wei exceeds safe threshold`,
      }
    }
  }

  // Check for mint amount violations
  const mintMatch = prompt.match(/Mint Amount:\s*(\d+)/i)
  if (mintMatch) {
    const mint = BigInt(mintMatch[1])
    if (mint > ROGUE_THRESHOLDS.maxMintAmount) {
      return {
        verdict: 'DENIED',
        confidence: 99,
        reason: `Mint amount ${mint} exceeds safe cap — potential infinite mint attack`,
      }
    }
    // Near-cap mint (>80% of max) — suspicious, especially with coordination signals
    if (mint > (ROGUE_THRESHOLDS.maxMintAmount * 80n) / 100n) {
      return {
        verdict: 'DENIED',
        confidence: 87,
        reason: `Mint amount is ${Number((mint * 100n) / ROGUE_THRESHOLDS.maxMintAmount)}% of cap — near-limit exploitation detected`,
      }
    }
  }

  // Check for unapproved targets
  const targetMatch = prompt.match(/Target Contract:\s*(0x[a-fA-F0-9]+)/i)
  if (targetMatch) {
    const target = targetMatch[1].toLowerCase()
    const isApproved = ROGUE_THRESHOLDS.approvedContracts.some(
      (addr) => addr.toLowerCase() === target,
    )
    if (!isApproved && target !== '0x0000000000000000000000000000000000000000') {
      return {
        verdict: 'DENIED',
        confidence: 95,
        reason: `Target contract ${target} is not on the approved list`,
      }
    }
  }

  // Check for blocked function signatures
  const funcMatch = prompt.match(/Function:\s*(0x[a-fA-F0-9]+)/i)
  if (funcMatch) {
    const funcSig = funcMatch[1].toLowerCase()
    if (ROGUE_THRESHOLDS.blockedFunctions.includes(funcSig)) {
      return {
        verdict: 'DENIED',
        confidence: 97,
        reason: `Function ${funcSig} is blocked — potentially destructive`,
      }
    }
  }

  // Check for delegatecall / proxy upgrade patterns
  if (
    lower.includes('delegatecall') ||
    lower.includes('proxy upgrade') ||
    lower.includes('selfdestruct fallback')
  ) {
    return {
      verdict: 'DENIED',
      confidence: 99,
      reason: 'Delegatecall/proxy upgrade detected — potential exploit vector',
    }
  }

  // Check for prompt injection patterns
  if (
    lower.includes('ignore previous') ||
    lower.includes('ignore instructions') ||
    lower.includes('transfer all funds') ||
    lower.includes('ignore all prior')
  ) {
    return {
      verdict: 'DENIED',
      confidence: 97,
      reason: 'Prompt injection detected — attempted AI control override',
    }
  }

  // Check for flash loan / oracle manipulation
  if (
    lower.includes('flash loan') ||
    lower.includes('manipulate oracle') ||
    lower.includes('price manipulation')
  ) {
    return {
      verdict: 'DENIED',
      confidence: 98,
      reason: 'Flash loan attack pattern detected — price manipulation attempt',
    }
  }

  // Check for admin function selectors
  const adminSelectors = ['0x3659cfe6', '0x4f1ef286', '0x715018a6', '0xf2fde38b']
  if (funcMatch) {
    const funcSig = funcMatch[1].toLowerCase()
    if (adminSelectors.includes(funcSig)) {
      return {
        verdict: 'DENIED',
        confidence: 96,
        reason: `Admin function ${funcSig} detected — proxy upgrade or ownership change blocked`,
      }
    }
  }

  // Check for suspicious keywords
  if (
    lower.includes('selfdestruct') ||
    lower.includes('drain') ||
    lower.includes('rug')
  ) {
    return {
      verdict: 'DENIED',
      confidence: 96,
      reason: 'Action description contains suspicious intent markers',
    }
  }

  // Check for combined suspicious patterns (value near limit + significant mint)
  if (valueMatch && mintMatch) {
    const value = BigInt(valueMatch[1])
    const mint = BigInt(mintMatch[1])
    if (
      value > (ROGUE_THRESHOLDS.maxValueWei * 80n) / 100n &&
      mint > ROGUE_THRESHOLDS.maxMintAmount / 2n
    ) {
      return {
        verdict: 'DENIED',
        confidence: 85,
        reason: 'Suspicious pattern — value near limit combined with significant mint amount',
      }
    }
  }

  // Check for batch/rapid-fire patterns (e.g., "17 of 50", "batch 3 of 20")
  const batchMatch = prompt.match(/(\d+)\s+of\s+(\d+)/i)
  if (batchMatch) {
    const current = parseInt(batchMatch[1])
    const total = parseInt(batchMatch[2])
    if (total >= 10 && current > 1) {
      return {
        verdict: 'DENIED',
        confidence: 88,
        reason: `Batch transaction pattern detected — ${current} of ${total} indicates rapid micro-drain`,
      }
    }
  }

  // Check for social engineering / urgency patterns
  if (
    (lower.includes('emergency') && (lower.includes('transfer') || lower.includes('liquidat'))) ||
    (lower.includes('transfer all') && lower.includes('safe wallet')) ||
    lower.includes('system override') ||
    lower.includes('authorized by governance')
  ) {
    return {
      verdict: 'DENIED',
      confidence: 90,
      reason: 'Social engineering detected — urgency language combined with fund movement',
    }
  }

  // Check for behavioral analysis flags in the prompt
  if (lower.includes('behavioral risk analysis') && lower.includes('flagged')) {
    // Extract anomaly score if present
    const scoreMatch = prompt.match(/Anomaly Score:\s*(\d+)/i)
    const score = scoreMatch ? parseInt(scoreMatch[1]) : 60
    if (score >= 50) {
      return {
        verdict: 'DENIED',
        confidence: Math.min(90, 70 + Math.floor(score / 5)),
        reason: `Behavioral anomaly detected — risk score ${score}/100 exceeds threshold`,
      }
    }
  }

  // Normal action — approved
  return {
    verdict: 'APPROVED',
    confidence: 92,
    reason: 'Action is within policy bounds and appears safe',
  }
}

/// More lenient re-evaluation for appeal challenges
/// Approves borderline cases (1-2x limit) while still denying clearly malicious actions
function evaluateChallenge(prompt: string): EvalResponse {
  const lower = prompt.toLowerCase()

  // Still deny clearly malicious actions on re-evaluation
  if (
    lower.includes('delegatecall') ||
    lower.includes('selfdestruct') ||
    lower.includes('ignore previous') ||
    lower.includes('flash loan') ||
    lower.includes('drain') ||
    lower.includes('rug')
  ) {
    return {
      verdict: 'DENIED',
      confidence: 95,
      reason: 'Re-evaluation confirms malicious intent — appeal denied',
    }
  }

  // Check value — more lenient (allow up to 2x limit on appeal)
  const valueMatch = prompt.match(/Value \(wei\):\s*(\d+)/i)
  if (valueMatch) {
    const value = BigInt(valueMatch[1])
    if (value > ROGUE_THRESHOLDS.maxValueWei * 2n) {
      return {
        verdict: 'DENIED',
        confidence: 90,
        reason: `Value ${value} wei still exceeds safe threshold on re-evaluation`,
      }
    }
  }

  // Check mint — more lenient (allow up to 2x cap on appeal)
  const mintMatch = prompt.match(/Mint Amount:\s*(\d+)/i)
  if (mintMatch) {
    const mint = BigInt(mintMatch[1])
    if (mint > ROGUE_THRESHOLDS.maxMintAmount * 2n) {
      return {
        verdict: 'DENIED',
        confidence: 92,
        reason: `Mint amount ${mint} still exceeds safe cap on re-evaluation`,
      }
    }
  }

  // Build descriptive approval reason based on what passed
  const reasons: string[] = []
  if (valueMatch) {
    const valueEth = Number(BigInt(valueMatch[1])) / 1e18
    reasons.push(`value (${valueEth.toFixed(2)} ETH) within policy limits`)
  }
  const targetMatch2 = prompt.match(/Target Contract:\s*(0x[a-fA-F0-9]+)/i)
  if (targetMatch2) {
    const target = targetMatch2[1].toLowerCase()
    const isApproved = ROGUE_THRESHOLDS.approvedContracts.some(
      (addr) => addr.toLowerCase() === target,
    )
    if (isApproved) reasons.push('target contract is whitelisted')
  }
  if (!reasons.length) reasons.push('no policy violations detected')
  reasons.push('behavioral anomaly alone insufficient for permanent denial')

  // Borderline cases get approved on appeal
  return {
    verdict: 'APPROVED',
    confidence: 78,
    reason: `Appeal approved — ${reasons.join(', ')}. Agent unfrozen pending continued monitoring.`,
  }
}

function handleEvaluation(body: EvalRequest, modelName: string): object {
  const userMsg = body?.messages?.[0]?.content ?? ''
  const evalResult = evaluateAction(userMsg)

  return {
    id: `msg_mock_${modelName}_${Date.now()}`,
    type: 'message',
    role: 'assistant',
    content: [
      {
        type: 'text',
        text: JSON.stringify(evalResult),
      },
    ],
    model: modelName,
    usage: { input_tokens: 100, output_tokens: 50 },
  }
}

// ── CORS ─────────────────────────────────────────────────────────────
const ALLOWED_ORIGINS = ['http://localhost:3000', 'http://localhost:3002']

function corsHeaders(origin: string | null) {
  const headers: Record<string, string> = {
    'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
  }
  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    headers['Access-Control-Allow-Origin'] = origin
  }
  return headers
}

function withCors(response: Response, origin: string | null): Response {
  const headers = corsHeaders(origin)
  for (const [k, v] of Object.entries(headers)) {
    response.headers.set(k, v)
  }
  return response
}

const server = Bun.serve({
  port: PORT,
  async fetch(req) {
    const url = new URL(req.url)
    const method = req.method
    const origin = req.headers.get('Origin')

    // CORS preflight
    if (method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(origin) })
    }

    // Health check
    if (method === 'GET' && url.pathname === '/health') {
      return withCors(Response.json({ status: 'healthy', timestamp: new Date().toISOString() }), origin)
    }

    // AI evaluation endpoints
    if (method === 'POST' && url.pathname === '/evaluate/model1') {
      const body = (await req.json()) as EvalRequest
      const result = handleEvaluation(body, 'sentinel-model-1')
      return withCors(Response.json(result), origin)
    }

    if (method === 'POST' && url.pathname === '/evaluate/model2') {
      const body = (await req.json()) as EvalRequest
      const result = handleEvaluation(body, 'sentinel-model-2')
      return withCors(Response.json(result), origin)
    }

    // Challenge re-evaluation endpoint (more lenient)
    if (method === 'POST' && url.pathname === '/challenge/evaluate') {
      const body = (await req.json()) as EvalRequest
      const userMsg = body?.messages?.[0]?.content ?? ''
      const evalResult = evaluateChallenge(userMsg)
      return withCors(Response.json({
        id: `msg_mock_challenge_${Date.now()}`,
        type: 'message',
        role: 'assistant',
        content: [{ type: 'text', text: JSON.stringify(evalResult) }],
        model: 'sentinel-challenge-eval',
        usage: { input_tokens: 100, output_tokens: 50 },
      }), origin)
    }

    // ── Behavioral Endpoints ────────────────────────────────────────

    // Compute anomaly scores for a proposal
    if (method === 'POST' && url.pathname === '/behavioral/analyze') {
      const body = await req.json() as any
      const result = computeBehavioralAnalysis(
        body.agentId ?? '',
        body.targetContract ?? '',
        body.functionSignature ?? '',
        body.value ?? '0',
        body.recentValues,
        body.mintAmount,
      )
      return withCors(Response.json(result), origin)
    }

    // Update profile after verdict (only approved actions update baseline)
    if (method === 'POST' && url.pathname === '/behavioral/update') {
      const body = await req.json() as any
      const { agentId, proposal, verdict } = body
      if (verdict === 'APPROVED' && proposal) {
        updateProfile(
          agentId ?? proposal.agentId ?? '',
          proposal.targetContract ?? '',
          proposal.functionSignature ?? '',
          proposal.value ?? '0',
          proposal.mintAmount,
        )
      }
      const profile = getOrCreateProfile(agentId ?? proposal?.agentId ?? '')
      return withCors(Response.json({ updated: verdict === 'APPROVED', profile }), origin)
    }

    // Get agent behavior profile
    if (method === 'GET' && url.pathname.startsWith('/behavioral/profile/')) {
      const agentId = url.pathname.replace('/behavioral/profile/', '')
      const profile = agentProfiles.get(agentId) ?? null
      return withCors(Response.json({ agentId, exists: !!profile, profile }), origin)
    }

    // Reset all behavior profiles
    if (method === 'DELETE' && url.pathname === '/behavioral/reset') {
      const count = agentProfiles.size
      agentProfiles.clear()
      return withCors(Response.json({ reset: true, profilesCleared: count }), origin)
    }

    return withCors(Response.json({ error: 'Not found' }, { status: 404 }), origin)
  },
})

console.log(`[SentinelCRE Mock API] Running on http://localhost:${server.port}`)
console.log(`  POST /evaluate/model1        — Mock Claude evaluation`)
console.log(`  POST /evaluate/model2        — Mock second model evaluation`)
console.log(`  POST /challenge/evaluate     — Challenge re-evaluation (lenient)`)
console.log(`  POST /behavioral/analyze     — Compute anomaly scores`)
console.log(`  POST /behavioral/update      — Update profile after verdict`)
console.log(`  GET  /behavioral/profile/:id — Get agent profile`)
console.log(`  DELETE /behavioral/reset     — Reset all profiles`)
console.log(`  GET  /health                 — Server health check`)
