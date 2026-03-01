'use client'

import type { VerdictEntry } from '@/hooks/useVerdictHistory'
import { getDefenseLayerCounts } from '@/lib/guardian-data'

interface Props {
  sessionVerdicts: VerdictEntry[]
}

export default function GuardianStatsBar({ sessionVerdicts }: Props) {
  const total = sessionVerdicts.length
  const approved = sessionVerdicts.filter((v) => v.consensus === 'APPROVED').length
  const denied = sessionVerdicts.filter((v) => v.consensus === 'DENIED').length
  const catchRate = total > 0 ? Math.round((denied / total) * 100) : 0

  const frozenAgentIds = new Set(
    sessionVerdicts
      .filter((v) => v.consensus === 'DENIED')
      .map((v) => v.proposal?.agentId)
      .filter(Boolean),
  )

  const avgAnomaly = total > 0
    ? Math.round(sessionVerdicts.reduce((s, v) => s + (v.anomalyScore ?? 0), 0) / total)
    : 0

  const layers = getDefenseLayerCounts(sessionVerdicts)
  const layersTriggered = [layers.behavioral > 0, layers.aiConsensus > 0, layers.onChain > 0].filter(Boolean).length

  const stats = [
    {
      label: 'Session Verdicts',
      value: total,
      sub: total > 0 ? `${approved} approved, ${denied} denied` : 'No activity yet',
      color: 'text-white',
      barApproved: total > 0 ? (approved / total) * 100 : 0,
    },
    {
      label: 'Threats Blocked',
      value: denied,
      sub: denied > 0 ? `${denied} attacks intercepted` : 'No threats detected',
      color: denied > 0 ? 'text-red-400' : 'text-gray-400',
    },
    {
      label: 'Catch Rate',
      value: `${catchRate}%`,
      sub: total > 0 ? `${denied} of ${total} actions blocked` : 'N/A',
      color: catchRate >= 80 ? 'text-green-400' : catchRate > 0 ? 'text-yellow-400' : 'text-gray-400',
    },
    {
      label: 'Agent Status',
      value: frozenAgentIds.size > 0 ? `${frozenAgentIds.size} Frozen` : 'All Active',
      sub: `${2 - frozenAgentIds.size} active, ${frozenAgentIds.size} frozen`,
      color: frozenAgentIds.size > 0 ? 'text-orange-400' : 'text-green-400',
    },
    {
      label: 'Avg Risk Score',
      value: `${avgAnomaly}/100`,
      sub: avgAnomaly >= 50 ? 'FLAGGED' : avgAnomaly >= 25 ? 'ELEVATED' : 'NORMAL',
      color: avgAnomaly >= 50 ? 'text-red-400' : avgAnomaly >= 25 ? 'text-orange-400' : 'text-green-400',
    },
    {
      label: 'Defense Coverage',
      value: `${layersTriggered}/3`,
      sub: layersTriggered === 3 ? 'All layers active' : layersTriggered > 0 ? `${layersTriggered} layers triggered` : 'No layers triggered',
      color: layersTriggered === 3 ? 'text-green-400' : layersTriggered > 0 ? 'text-yellow-400' : 'text-gray-400',
    },
  ]

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
      {stats.map((s, i) => (
        <div
          key={i}
          className="bg-gray-900 rounded-xl border border-gray-800 p-4"
        >
          <p className="text-lg font-bold text-gray-400 uppercase tracking-wider mb-2">
            {s.label}
          </p>
          <p className={`text-3xl font-black ${s.color} leading-none mb-1`}>
            {s.value}
          </p>
          <p className="text-base text-gray-400">{s.sub}</p>
          {'barApproved' in s && total > 0 && (
            <div className="flex h-1.5 rounded-full overflow-hidden mt-2 bg-gray-800">
              <div
                className="bg-green-400 transition-all duration-500"
                style={{ width: `${s.barApproved}%` }}
              />
              <div className="bg-red-400 flex-1" />
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
