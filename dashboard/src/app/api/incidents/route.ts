import { NextResponse } from 'next/server'
import { getClient } from '@/lib/sentinel-client'
import {
  ADDRESSES,
  SENTINEL_GUARDIAN_ABI,
  INCIDENT_TYPE_LABELS,
} from '@/lib/contracts'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const agentId = searchParams.get('agentId')

  if (!agentId) {
    return NextResponse.json({ error: 'agentId required' }, { status: 400 })
  }

  try {
    const client = getClient()
    const count = (await client.readContract({
      address: ADDRESSES.sentinelGuardian,
      abi: SENTINEL_GUARDIAN_ABI,
      functionName: 'getIncidentCount',
      args: [agentId as `0x${string}`],
    })) as bigint

    const limit = Math.min(Number(count), 10)
    const start = Number(count) - limit
    const incidents = []

    for (let i = start; i < Number(count); i++) {
      const incident = (await client.readContract({
        address: ADDRESSES.sentinelGuardian,
        abi: SENTINEL_GUARDIAN_ABI,
        functionName: 'getIncident',
        args: [agentId as `0x${string}`, BigInt(i)],
      })) as {
        timestamp: bigint
        agentId: string
        incidentType: number
        reason: string
        targetContract: string
        attemptedValue: bigint
      }

      incidents.push({
        timestamp: Number(incident.timestamp),
        agentId: incident.agentId,
        incidentType: incident.incidentType,
        incidentLabel: INCIDENT_TYPE_LABELS[incident.incidentType] ?? 'Unknown',
        reason: incident.reason,
        targetContract: incident.targetContract,
        attemptedValue: incident.attemptedValue.toString(),
      })
    }

    return NextResponse.json({ incidents })
  } catch {
    return NextResponse.json({ incidents: [] })
  }
}
