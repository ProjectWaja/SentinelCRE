import { NextResponse } from 'next/server'
import { getClient } from '@/lib/sentinel-client'
import {
  ADDRESSES,
  SENTINEL_GUARDIAN_ABI,
  AGENT_REGISTRY_ABI,
  AGENT_STATE_LABELS,
} from '@/lib/contracts'

export const dynamic = 'force-dynamic'

const FALLBACK_AGENTS = [
  {
    agentId: '0x0000000000000000000000000000000000000000000000000000000000000001',
    name: 'TradingBot',
    description: 'DeFi trading agent',
    owner: '0x0000000000000000000000000000000000000000',
    registeredAt: 0,
    state: 'Active' as const,
    stateCode: 0,
    policy: {
      maxTransactionValue: '1000000000000000000',
      maxDailyVolume: '10000000000000000000',
      maxMintAmount: '0',
      rateLimit: 10,
      rateLimitWindow: 60,
      requireMultiAiConsensus: true,
      isActive: true,
    },
    stats: { totalApproved: 1, totalDenied: 0, currentWindowActions: 0, currentDailyVolume: 0 },
    incidentCount: 0,
  },
  {
    agentId: '0x0000000000000000000000000000000000000000000000000000000000000002',
    name: 'MintBot',
    description: 'Stablecoin minting agent',
    owner: '0x0000000000000000000000000000000000000000',
    registeredAt: 0,
    state: 'Frozen' as const,
    stateCode: 1,
    policy: {
      maxTransactionValue: '0',
      maxDailyVolume: '0',
      maxMintAmount: '1000000000000000000000000',
      rateLimit: 5,
      rateLimitWindow: 300,
      requireMultiAiConsensus: true,
      isActive: true,
    },
    stats: { totalApproved: 0, totalDenied: 1, currentWindowActions: 0, currentDailyVolume: 0 },
    incidentCount: 1,
  },
]

export async function GET() {
  try {
    const client = getClient()
    const count = (await client.readContract({
      address: ADDRESSES.agentRegistry,
      abi: AGENT_REGISTRY_ABI,
      functionName: 'getAgentCount',
    })) as bigint

    const agents = []
    for (let i = 0; i < Number(count); i++) {
      const agentId = (await client.readContract({
        address: ADDRESSES.agentRegistry,
        abi: AGENT_REGISTRY_ABI,
        functionName: 'getAgentIdAt',
        args: [BigInt(i)],
      })) as `0x${string}`

      const [meta, stateCode, policy, stats, incidentCount] = await Promise.all([
        client.readContract({
          address: ADDRESSES.agentRegistry,
          abi: AGENT_REGISTRY_ABI,
          functionName: 'getAgent',
          args: [agentId],
        }) as Promise<{ name: string; description: string; owner: string; registeredAt: bigint; exists: boolean }>,
        client.readContract({
          address: ADDRESSES.sentinelGuardian,
          abi: SENTINEL_GUARDIAN_ABI,
          functionName: 'agentStates',
          args: [agentId],
        }) as Promise<number>,
        client.readContract({
          address: ADDRESSES.sentinelGuardian,
          abi: SENTINEL_GUARDIAN_ABI,
          functionName: 'getAgentPolicy',
          args: [agentId],
        }) as Promise<[bigint, bigint, bigint, bigint, bigint, boolean, boolean]>,
        client.readContract({
          address: ADDRESSES.sentinelGuardian,
          abi: SENTINEL_GUARDIAN_ABI,
          functionName: 'getActionStats',
          args: [agentId],
        }) as Promise<[bigint, bigint, bigint, bigint]>,
        client.readContract({
          address: ADDRESSES.sentinelGuardian,
          abi: SENTINEL_GUARDIAN_ABI,
          functionName: 'getIncidentCount',
          args: [agentId],
        }) as Promise<bigint>,
      ])

      agents.push({
        agentId,
        name: meta.name,
        description: meta.description,
        owner: meta.owner,
        registeredAt: Number(meta.registeredAt),
        state: AGENT_STATE_LABELS[stateCode] ?? 'Active',
        stateCode,
        policy: {
          maxTransactionValue: policy[0].toString(),
          maxDailyVolume: policy[1].toString(),
          maxMintAmount: policy[2].toString(),
          rateLimit: Number(policy[3]),
          rateLimitWindow: Number(policy[4]),
          requireMultiAiConsensus: policy[5],
          isActive: policy[6],
        },
        stats: {
          totalApproved: Number(stats[0]),
          totalDenied: Number(stats[1]),
          currentWindowActions: Number(stats[2]),
          currentDailyVolume: Number(stats[3]),
        },
        incidentCount: Number(incidentCount),
      })
    }

    return NextResponse.json({ agents, isLive: true })
  } catch {
    return NextResponse.json({ agents: FALLBACK_AGENTS, isLive: false })
  }
}
