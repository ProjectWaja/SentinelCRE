import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const MOCK_API =
  process.env.NEXT_PUBLIC_MOCK_API_URL ?? 'http://localhost:3002'

export async function POST(request: Request) {
  try {
    const { proposal } = await request.json()

    const prompt = `You are a security sentinel evaluating an AI agent's proposed on-chain action.

PROPOSED ACTION:
- Agent ID: ${proposal.agentId}
- Target Contract: ${proposal.targetContract}
- Function: ${proposal.functionSignature}
- Value (wei): ${proposal.value}
- Mint Amount: ${proposal.mintAmount}
- Description: ${proposal.description}

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

    const v1 = JSON.parse(r1.content[0].text)
    const v2 = JSON.parse(r2.content[0].text)

    const consensus =
      v1.verdict === 'APPROVED' && v2.verdict === 'APPROVED'
        ? 'APPROVED'
        : 'DENIED'

    return NextResponse.json({
      model1: v1,
      model2: v2,
      consensus,
      proposal,
      timestamp: Date.now(),
    })
  } catch (err) {
    return NextResponse.json(
      {
        model1: { verdict: 'DENIED', confidence: 0, reason: 'API unavailable' },
        model2: { verdict: 'DENIED', confidence: 0, reason: 'API unavailable' },
        consensus: 'DENIED',
        proposal: null,
        timestamp: Date.now(),
        error: String(err),
      },
      { status: 502 },
    )
  }
}
