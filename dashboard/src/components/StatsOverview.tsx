'use client'

import type { SentinelDashboardData } from '@/hooks/useSentinelData'
import type { VerdictEntry } from '@/hooks/useVerdictHistory'

export default function StatsOverview({
  data,
  sessionVerdicts = [],
}: {
  data: SentinelDashboardData
  sessionVerdicts?: VerdictEntry[]
}) {
  const sessionApproved = sessionVerdicts.filter((v) => v.consensus === 'APPROVED').length
  const sessionDenied = sessionVerdicts.filter((v) => v.consensus === 'DENIED').length

  const frozenAgentIds = new Set(
    sessionVerdicts
      .filter((v) => v.consensus === 'DENIED')
      .map((v) => v.proposal?.agentId)
      .filter(Boolean),
  )

  const totalApproved = data.totalApproved + sessionApproved
  const totalDenied = data.totalDenied + sessionDenied
  const totalFrozen = data.frozenAgents + frozenAgentIds.size
  const totalActive = Math.max(0, data.activeAgents - frozenAgentIds.size)

  const cards = [
    { label: 'Total Approved', value: totalApproved, delta: sessionApproved, color: 'text-green-400', bg: 'bg-green-400/10', border: 'border-green-400/20' },
    { label: 'Total Denied', value: totalDenied, delta: sessionDenied, color: 'text-red-400', bg: 'bg-red-400/10', border: 'border-red-400/20' },
    { label: 'Active Agents', value: totalActive, delta: frozenAgentIds.size > 0 ? -frozenAgentIds.size : 0, color: 'text-blue-400', bg: 'bg-blue-400/10', border: 'border-blue-400/20' },
    { label: 'Frozen Agents', value: totalFrozen, delta: frozenAgentIds.size, color: 'text-orange-400', bg: 'bg-orange-400/10', border: 'border-orange-400/20' },
  ]

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
      {cards.map((card) => (
        <div
          key={card.label}
          className={`${card.bg} rounded-2xl p-6 border ${card.border}`}
        >
          <p className="text-lg text-gray-400 mb-2 font-semibold">{card.label}</p>
          <div className="flex items-end gap-3">
            <p className={`text-5xl font-mono font-black ${card.color}`}>
              {card.value}
            </p>
            {card.delta !== 0 && (
              <span className="text-base font-bold mb-1 text-yellow-400">
                {card.delta > 0 ? '+' : ''}{card.delta} this session
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
