import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const MOCK_API = process.env.NEXT_PUBLIC_MOCK_API_URL ?? 'http://localhost:3002'

export async function DELETE() {
  try {
    const res = await fetch(`${MOCK_API}/behavioral/reset`, { method: 'DELETE' })
    const data = await res.json()
    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ reset: false, error: 'API unavailable' }, { status: 502 })
  }
}
