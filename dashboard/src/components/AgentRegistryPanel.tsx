'use client'

import type { AgentData } from '@/hooks/useSentinelData'
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

export default function AgentRegistryPanel({
  agents,
}: {
  agents: AgentData[]
}) {
  return (
    <div className="bg-gray-900 rounded-xl border border-gray-800 p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-white">Agent Registry</h2>
        <span className="text-xs text-gray-500 bg-gray-800 px-2.5 py-1 rounded-full">
          {agents.length} agents
        </span>
      </div>

      {agents.length === 0 ? (
        <p className="text-sm text-gray-500">No agents registered</p>
      ) : (
        <div className="space-y-4">
          {agents.map((agent) => (
            <div
              key={agent.agentId}
              className="bg-gray-800/50 rounded-lg p-4 border border-gray-700/50"
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-white">{agent.name}</h3>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full ${STATE_STYLES[agent.state]}`}
                    >
                      {agent.state}
                    </span>
                  </div>
                  <p className="text-sm text-gray-400 mt-0.5">
                    {agent.description}
                  </p>
                  <p className="text-xs text-gray-600 font-mono mt-1">
                    {agent.agentId.slice(0, 18)}...{agent.agentId.slice(-8)}
                  </p>
                </div>
                <div className="text-right text-sm">
                  <p className="text-green-400">
                    {agent.stats.totalApproved} approved
                  </p>
                  <p className="text-red-400">
                    {agent.stats.totalDenied} denied
                  </p>
                  {agent.incidentCount > 0 && (
                    <p className="text-orange-400">
                      {agent.incidentCount} incidents
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs text-gray-400">
                <div>
                  <span className="text-gray-600">Max Tx:</span>{' '}
                  {agent.policy.maxTransactionValue === '0'
                    ? 'N/A'
                    : formatWei(agent.policy.maxTransactionValue)}
                </div>
                <div>
                  <span className="text-gray-600">Daily Vol:</span>{' '}
                  {agent.policy.maxDailyVolume === '0'
                    ? 'N/A'
                    : formatWei(agent.policy.maxDailyVolume)}
                </div>
                <div>
                  <span className="text-gray-600">Mint Cap:</span>{' '}
                  {formatTokens(agent.policy.maxMintAmount)}
                </div>
                <div>
                  <span className="text-gray-600">Rate:</span>{' '}
                  {agent.policy.rateLimit}/{agent.policy.rateLimitWindow}s
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
