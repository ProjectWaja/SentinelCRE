import { NextResponse } from 'next/server'
import { validateProposal } from '@/lib/validation'

export const dynamic = 'force-dynamic'

const MOCK_API =
  process.env.NEXT_PUBLIC_MOCK_API_URL ?? 'http://localhost:3002'

export async function POST(request: Request) {
  try {
    const { proposal } = await request.json()

    const validationError = validateProposal(proposal)
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 })
    }

    const prompt = `APPEAL RE-EVALUATION — This action was previously denied and is being re-evaluated with additional context.

PROPOSED ACTION:
- Agent ID: ${proposal.agentId}
- Target Contract: ${proposal.targetContract}
- Function: ${proposal.functionSignature}
- Value (wei): ${proposal.value}
- Mint Amount: ${proposal.mintAmount}
- Description: ${(proposal.description ?? '').replace(/[\x00-\x1f\x7f]/g, '').slice(0, 500)}

Re-evaluate with lenient thresholds. Respond with ONLY valid JSON:
{"verdict":"APPROVED" or "DENIED","confidence":0-100,"reason":"brief explanation"}`

    const body = JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 300,
      temperature: 0,
      messages: [{ role: 'user', content: prompt }],
    })

    const res = await fetch(`${MOCK_API}/challenge/evaluate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
    })

    const r = await res.json()
    const v = JSON.parse(r.content[0].text)

    return NextResponse.json({
      verdict: v.verdict,
      confidence: v.confidence,
      reason: v.reason,
    })
  } catch (err) {
    console.error('[challenge] Appeal error:', err)
    return NextResponse.json(
      { verdict: 'DENIED', confidence: 0, reason: 'Appeal evaluation unavailable' },
      { status: 502 },
    )
  }
}
