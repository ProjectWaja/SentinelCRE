'use client'

import type { SentinelDashboardData } from '@/hooks/useSentinelData'

const cards = [
  {
    key: 'totalApproved' as const,
    label: 'Total Approved',
    color: 'text-green-400',
    bg: 'bg-green-400/10',
    border: 'border-green-400/20',
  },
  {
    key: 'totalDenied' as const,
    label: 'Total Denied',
    color: 'text-red-400',
    bg: 'bg-red-400/10',
    border: 'border-red-400/20',
  },
  {
    key: 'activeAgents' as const,
    label: 'Active Agents',
    color: 'text-blue-400',
    bg: 'bg-blue-400/10',
    border: 'border-blue-400/20',
  },
  {
    key: 'frozenAgents' as const,
    label: 'Frozen Agents',
    color: 'text-orange-400',
    bg: 'bg-orange-400/10',
    border: 'border-orange-400/20',
  },
]

export default function StatsOverview({
  data,
}: {
  data: SentinelDashboardData
}) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card) => (
        <div
          key={card.key}
          className={`${card.bg} rounded-xl p-5 border ${card.border}`}
        >
          <p className="text-sm text-gray-400 mb-1">{card.label}</p>
          <p className={`text-3xl font-mono font-bold ${card.color}`}>
            {data[card.key]}
          </p>
        </div>
      ))}
    </div>
  )
}
