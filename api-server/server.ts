/**
 * SentinelCRE — Mock AI Evaluation Server
 *
 * Deterministic AI evaluation endpoints for CRE workflow simulation.
 * Same input always produces same output (required for DON consensus).
 *
 * Endpoints:
 *   POST /evaluate/model1 — Mock Claude evaluation
 *   POST /evaluate/model2 — Mock second model evaluation
 *   GET  /health           — Server health check
 *
 * Usage: bun run api-server/server.ts
 */

const PORT = Number(process.env.MOCK_API_PORT ?? 3002)

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

  // Borderline cases get approved on appeal
  return {
    verdict: 'APPROVED',
    confidence: 78,
    reason: 'Re-evaluation approved — action within acceptable risk tolerance on appeal',
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

const server = Bun.serve({
  port: PORT,
  async fetch(req) {
    const url = new URL(req.url)
    const method = req.method

    // Health check
    if (method === 'GET' && url.pathname === '/health') {
      return Response.json({ status: 'healthy', timestamp: new Date().toISOString() })
    }

    // AI evaluation endpoints
    if (method === 'POST' && url.pathname === '/evaluate/model1') {
      const body = (await req.json()) as EvalRequest
      const result = handleEvaluation(body, 'sentinel-model-1')
      return Response.json(result)
    }

    if (method === 'POST' && url.pathname === '/evaluate/model2') {
      const body = (await req.json()) as EvalRequest
      const result = handleEvaluation(body, 'sentinel-model-2')
      return Response.json(result)
    }

    // Challenge re-evaluation endpoint (more lenient)
    if (method === 'POST' && url.pathname === '/challenge/evaluate') {
      const body = (await req.json()) as EvalRequest
      const userMsg = body?.messages?.[0]?.content ?? ''
      const evalResult = evaluateChallenge(userMsg)
      return Response.json({
        id: `msg_mock_challenge_${Date.now()}`,
        type: 'message',
        role: 'assistant',
        content: [{ type: 'text', text: JSON.stringify(evalResult) }],
        model: 'sentinel-challenge-eval',
        usage: { input_tokens: 100, output_tokens: 50 },
      })
    }

    return Response.json({ error: 'Not found' }, { status: 404 })
  },
})

console.log(`[SentinelCRE Mock API] Running on http://localhost:${server.port}`)
console.log(`  POST /evaluate/model1     — Mock Claude evaluation`)
console.log(`  POST /evaluate/model2     — Mock second model evaluation`)
console.log(`  POST /challenge/evaluate  — Challenge re-evaluation (lenient)`)
console.log(`  GET  /health              — Server health check`)
