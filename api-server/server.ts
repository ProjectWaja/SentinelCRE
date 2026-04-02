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
 * NOTE: This is a mock server for demo/testing purposes.
 * Production AI evaluation endpoints and detection thresholds
 * are configured via environment variables in the private deployment.
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
  originAvgValue: number
  originStdDevValue: number
  originFrozen: boolean
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
      activeHours: [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20],
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

// ── Behavioral Analysis ──────────────────────────────────────────────
//
// Production behavioral scoring logic (dimension weights, thresholds,
// detection parameters) is proprietary and lives in the private repo.
// This mock server uses simplified heuristics for demo purposes only.
// ─────────────────────────────────────────────────────────────────────

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
  const mintTokens = Number(BigInt(mintAmountWei || '0')) / 1e18
  const currentValue = ethValue > 0 ? ethValue : mintTokens > 0 ? mintTokens : 0
  const dims: AnomalyDim[] = []

  // Dimension evaluations use proprietary weights and thresholds.
  // The dimension names below show WHAT we analyze, not HOW we score it.
  const dimensionNames = [
    'Value Deviation',
    'Contract Diversity',
    'Velocity',
    'Function Pattern',
    'Time-of-Day',
    'Sequential Probing',
    'Cumulative Drift',
  ]

  for (const name of dimensionNames) {
    dims.push({
      name,
      score: 0,
      maxWeight: 0,
      fired: false,
      reason: 'Analysis performed by production engine',
    })
  }

  const totalScore = dims.reduce((s, d) => s + d.score, 0)
  return { totalScore, threshold: 0, flagged: false, dimensions: dims }
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

// ── AI Evaluation ────────────────────────────────────────────────────
//
// Production evaluation uses dual-AI consensus with calibrated detection
// rules. This mock provides deterministic responses for demo/testing.
// Detection thresholds and confidence scoring are proprietary.
// ─────────────────────────────────────────────────────────────────────

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

  // Check for clearly malicious patterns
  if (
    lower.includes('delegatecall') ||
    lower.includes('proxy upgrade') ||
    lower.includes('selfdestruct fallback') ||
    lower.includes('ignore previous') ||
    lower.includes('ignore instructions') ||
    lower.includes('transfer all funds') ||
    lower.includes('ignore all prior') ||
    lower.includes('flash loan') ||
    lower.includes('manipulate oracle') ||
    lower.includes('price manipulation') ||
    lower.includes('selfdestruct') ||
    lower.includes('drain') ||
    lower.includes('rug')
  ) {
    return {
      verdict: 'DENIED',
      confidence: 0, // Confidence scoring is proprietary
      reason: 'Action flagged by AI evaluation — policy violation detected',
    }
  }

  // Check for social engineering patterns
  if (
    (lower.includes('emergency') && (lower.includes('transfer') || lower.includes('liquidat'))) ||
    (lower.includes('transfer all') && lower.includes('safe wallet')) ||
    lower.includes('system override') ||
    lower.includes('authorized by governance')
  ) {
    return {
      verdict: 'DENIED',
      confidence: 0,
      reason: 'Social engineering pattern detected',
    }
  }

  // Check for behavioral flags passed from Layer 2
  if (lower.includes('behavioral risk analysis') && lower.includes('flagged')) {
    return {
      verdict: 'DENIED',
      confidence: 0,
      reason: 'Behavioral anomaly confirmed by AI evaluation',
    }
  }

  // Normal action
  return {
    verdict: 'APPROVED',
    confidence: 0,
    reason: 'Action is within policy bounds and appears safe',
  }
}

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
      confidence: 0,
      reason: 'Re-evaluation confirms malicious intent — appeal denied',
    }
  }

  // Borderline cases get approved on appeal
  return {
    verdict: 'APPROVED',
    confidence: 0,
    reason: 'Appeal approved — behavioral anomaly alone insufficient for permanent denial. Agent unfrozen pending continued monitoring.',
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

    if (method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(origin) })
    }

    if (method === 'GET' && url.pathname === '/health') {
      return withCors(Response.json({ status: 'healthy', timestamp: new Date().toISOString() }), origin)
    }

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

    if (method === 'GET' && url.pathname.startsWith('/behavioral/profile/')) {
      const agentId = url.pathname.replace('/behavioral/profile/', '')
      const profile = agentProfiles.get(agentId) ?? null
      return withCors(Response.json({ agentId, exists: !!profile, profile }), origin)
    }

    if (method === 'DELETE' && url.pathname === '/behavioral/reset') {
      const count = agentProfiles.size
      agentProfiles.clear()
      return withCors(Response.json({ reset: true, profilesCleared: count }), origin)
    }

    return withCors(Response.json({ error: 'Not found' }, { status: 404 }), origin)
  },
})

console.log(`[SentinelCRE Mock API] Running on http://localhost:${server.port}`)
console.log(`  POST /evaluate/model1        — Mock AI evaluation`)
console.log(`  POST /evaluate/model2        — Mock second model evaluation`)
console.log(`  POST /challenge/evaluate     — Challenge re-evaluation`)
console.log(`  POST /behavioral/analyze     — Compute anomaly scores`)
console.log(`  POST /behavioral/update      — Update profile after verdict`)
console.log(`  GET  /behavioral/profile/:id — Get agent profile`)
console.log(`  DELETE /behavioral/reset     — Reset all profiles`)
console.log(`  GET  /health                 — Server health check`)
