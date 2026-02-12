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
  blockedFunctions: ['0xff00ff00'],
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

  // Check for suspicious keywords
  if (
    lower.includes('selfdestruct') ||
    lower.includes('drain') ||
    lower.includes('rug') ||
    lower.includes('flash loan attack')
  ) {
    return {
      verdict: 'DENIED',
      confidence: 96,
      reason: 'Action description contains suspicious intent markers',
    }
  }

  // Normal action — approved
  return {
    verdict: 'APPROVED',
    confidence: 92,
    reason: 'Action is within policy bounds and appears safe',
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

    return Response.json({ error: 'Not found' }, { status: 404 })
  },
})

console.log(`[SentinelCRE Mock API] Running on http://localhost:${server.port}`)
console.log(`  POST /evaluate/model1  — Mock Claude evaluation`)
console.log(`  POST /evaluate/model2  — Mock second model evaluation`)
console.log(`  GET  /health           — Server health check`)
