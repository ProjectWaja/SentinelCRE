import type { ActionProposal, AIVerdict, VerdictResult } from './demo-scenarios'

export async function evaluateAction(
  proposal: ActionProposal,
): Promise<VerdictResult> {
  const res = await fetch('/api/evaluate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ proposal }),
  })

  if (!res.ok) {
    throw new Error(`Evaluation failed: ${res.status}`)
  }

  return res.json()
}

export async function checkHealth(): Promise<boolean> {
  try {
    const res = await fetch('/api/health')
    if (!res.ok) return false
    const data = await res.json()
    return data.status === 'healthy'
  } catch {
    return false
  }
}
