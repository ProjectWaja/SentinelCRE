'use client'

import type { AgentData } from '@/hooks/useSentinelData'
import type { VerdictEntry } from '@/hooks/useVerdictHistory'
import { DEMO_AGENTS } from '@/lib/demo-scenarios'
import { formatEther } from 'viem'

const STATE_STYLES = {
  Active: 'text-green-400 bg-green-400/10',
  Frozen: 'text-orange-400 bg-orange-400/10',
  Revoked: 'text-red-400 bg-red-400/10',
} as const

function formatWei(wei: string): string {
  try {
    return `${formatEther(BigInt(wei))} ETH`
  } catch {
    return wei
  }
}

function formatTokens(raw: string): string {
  try {
    const n = BigInt(raw)
    if (n === 0n) return 'N/A'
    return `${(Number(n) / 1e18).toLocaleString()} tokens`
  } catch {
    return raw
  }
}

// Default policy for demo agents that aren't in the API
const DEMO_POLICY = {
  maxTransactionValue: '1000000000000000000', // 1 ETH
  maxDailyVolume: '10000000000000000000', // 10 ETH
  maxMintAmount: '1000000000000000000000000', // 1M tokens
  rateLimit: 10,
  rateLimitWindow: 60,
  requireMultiAiConsensus: true,
  isActive: true,
}

function makeDemoAgent(demo: typeof DEMO_AGENTS[number]): AgentData {
  return {
    agentId: demo.id,
    name: demo.name,
    description: demo.description,
    owner: '0x0000000000000000000000000000000000000000',
    registeredAt: 0,
    state: 'Active',
    stateCode: 0,
    policy: DEMO_POLICY,
    stats: { totalApproved: 0, totalDenied: 0, currentWindowActions: 0, currentDailyVolume: 0 },
    incidentCount: 0,
  }
}

export default function AgentRegistryPanel({
  agents,
  sessionVerdicts = [],
}: {
  agents: AgentData[]
  sessionVerdicts?: VerdictEntry[]
}) {
  // Merge demo agents into the list if the API didn't return them
  const agentIds = new Set(agents.map((a) => a.agentId))
  const mergedAgents = [
    ...agents,
    ...DEMO_AGENTS.filter((d) => !agentIds.has(d.id)).map(makeDemoAgent),
  ]

  const agentSessionStats = new Map<string, { approved: number; denied: number; severity?: string }>()
  for (const v of sessionVerdicts) {
    const id = v.proposal?.agentId
    if (!id) continue
    const prev = agentSessionStats.get(id) ?? { approved: 0, denied: 0 }
    if (v.consensus === 'APPROVED') prev.approved++
    else {
      prev.denied++
      if (v.severity === 'CRITICAL') prev.severity = 'CRITICAL'
      else if (v.severity === 'MEDIUM' && prev.severity !== 'CRITICAL') prev.severity = 'MEDIUM'
      else if (!prev.severity) prev.severity = v.severity
    }
    agentSessionStats.set(id, prev)
  }

  return (
    <div className="bg-gray-900 rounded-2xl border border-gray-800 p-8">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-black text-white">Agent Registry</h2>
        <span className="text-base text-gray-500 bg-gray-800 px-4 py-1.5 rounded-full font-semibold">
          {mergedAgents.length} agents
        </span>
      </div>

      {mergedAgents.length === 0 ? (
        <p className="text-lg text-gray-500">No agents registered</p>
      ) : (
        <div className="space-y-5">
          {mergedAgents.map((agent) => {
            const session = agentSessionStats.get(agent.agentId)
            const sessionFrozen = session && session.denied > 0
            const effectiveState = sessionFrozen ? 'Frozen' : agent.state

            return (
              <div
                key={agent.agentId}
                className="bg-gray-800/50 rounded-xl p-6 border border-gray-700/50"
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="flex items-center gap-3">
                      <h3 className="text-xl font-bold text-white">{agent.name}</h3>
                      <span
                        className={`text-sm px-3 py-1 rounded-full font-bold ${STATE_STYLES[effectiveState]}`}
                      >
                        {effectiveState}
                      </span>
                      {sessionFrozen && agent.state === 'Active' && (
                        <span className="text-sm px-3 py-1 rounded-full text-yellow-400 bg-yellow-400/10 font-bold">
                          Demo
                        </span>
                      )}
                    </div>
                    <p className="text-base text-gray-400 mt-1">
                      {agent.description}
                    </p>
                    <p className="text-sm text-gray-600 font-mono mt-1">
                      {agent.agentId.slice(0, 18)}...{agent.agentId.slice(-8)}
                    </p>
                  </div>
                  <div className="text-right text-base">
                    <p className="text-green-400 font-semibold">
                      {agent.stats.totalApproved + (session?.approved ?? 0)} approved
                      {session && session.approved > 0 && (
                        <span className="text-yellow-400 text-sm ml-2">(+{session.approved})</span>
                      )}
                    </p>
                    <p className="text-red-400 font-semibold">
                      {agent.stats.totalDenied + (session?.denied ?? 0)} denied
                      {session && session.denied > 0 && (
                        <span className="text-yellow-400 text-sm ml-2">(+{session.denied})</span>
                      )}
                    </p>
                    {(agent.incidentCount > 0 || (session && session.denied > 0)) && (
                      <p className="text-orange-400 font-semibold">
                        {agent.incidentCount + (session?.denied ?? 0)} incidents
                      </p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-base text-gray-400">
                  <div>
                    <span className="text-gray-600 font-semibold">Max Tx:</span>{' '}
                    {agent.policy.maxTransactionValue === '0'
                      ? 'N/A'
                      : formatWei(agent.policy.maxTransactionValue)}
                  </div>
                  <div>
                    <span className="text-gray-600 font-semibold">Daily Vol:</span>{' '}
                    {agent.policy.maxDailyVolume === '0'
                      ? 'N/A'
                      : formatWei(agent.policy.maxDailyVolume)}
                  </div>
                  <div>
                    <span className="text-gray-600 font-semibold">Mint Cap:</span>{' '}
                    {formatTokens(agent.policy.maxMintAmount)}
                  </div>
                  <div>
                    <span className="text-gray-600 font-semibold">Rate:</span>{' '}
                    {agent.policy.rateLimit}/{agent.policy.rateLimitWindow}s
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
