import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const MOCK_API =
  process.env.NEXT_PUBLIC_MOCK_API_URL ?? 'http://localhost:3002'

export async function GET() {
  try {
    const res = await fetch(`${MOCK_API}/health`, { signal: AbortSignal.timeout(3000) })
    const data = await res.json()
    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ status: 'offline' })
  }
}
