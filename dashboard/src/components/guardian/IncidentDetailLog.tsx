'use client'

import { useState } from 'react'
import type { VerdictEntry } from '@/hooks/useVerdictHistory'
import { matchScenario, getDefenseLayer, DEFENSE_LAYER_META } from '@/lib/guardian-data'
import { DEMO_AGENTS } from '@/lib/demo-scenarios'

interface Props {
  sessionVerdicts: VerdictEntry[]
}

type Filter = 'all' | 'CRITICAL' | 'MEDIUM' | 'LOW' | 'tradingbot' | 'mintbot'

const AGENT_MAP: Record<string, string> = {
  [DEMO_AGENTS[0].id]: 'TradingBot',
  [DEMO_AGENTS[1].id]: 'MintBot',
}

export default function IncidentDetailLog({ sessionVerdicts }: Props) {
  const [filter, setFilter] = useState<Filter>('all')
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const incidents = sessionVerdicts.filter((v) => v.consensus === 'DENIED')

  const filtered = incidents.filter((v) => {
    if (filter === 'all') return true
    if (filter === 'CRITICAL' || filter === 'MEDIUM' || filter === 'LOW')
      return v.severity === filter
    if (filter === 'tradingbot') return v.proposal?.agentId === DEMO_AGENTS[0].id
    if (filter === 'mintbot') return v.proposal?.agentId === DEMO_AGENTS[1].id
    return true
  })

  const filters: { key: Filter; label: string }[] = [
    { key: 'all', label: `All (${incidents.length})` },
    { key: 'CRITICAL', label: 'Critical' },
    { key: 'MEDIUM', label: 'Medium' },
    { key: 'LOW', label: 'Low' },
    { key: 'tradingbot', label: 'TradingBot' },
    { key: 'mintbot', label: 'MintBot' },
  ]

  return (
    <div className="bg-gray-900 rounded-2xl border border-gray-800 p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-black text-white uppercase tracking-widest">
          Incident Log
        </h2>
        <span className="text-xs font-bold text-red-400 bg-red-400/10 px-3 py-1 rounded-full border border-red-400/30">
          {incidents.length} incidents
        </span>
      </div>

      {/* Filter pills */}
      <div className="flex flex-wrap gap-2 mb-4">
        {filters.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`text-xs font-bold px-3 py-1.5 rounded-full border transition-colors ${
              filter === f.key
                ? 'text-white bg-gray-700 border-gray-600'
                : 'text-gray-500 bg-transparent border-gray-800 hover:border-gray-700'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Incident list */}
      {filtered.length === 0 ? (
        <p className="text-sm text-gray-600 text-center py-8">
          {incidents.length === 0
            ? 'No incidents recorded. Run attack scenarios from the Demo tab.'
            : 'No incidents match this filter.'}
        </p>
      ) : (
        <div className="space-y-2 max-h-[400px] overflow-y-auto scrollbar-thin">
          {filtered.map((v) => {
            const scenario = matchScenario(v)
            const layer = getDefenseLayer(v)
            const layerMeta = DEFENSE_LAYER_META[layer]
            const agentName = AGENT_MAP[v.proposal?.agentId ?? ''] ?? 'Unknown'
            const isExpanded = expandedId === v.id

            return (
              <div key={v.id} className="bg-gray-800/50 rounded-lg border border-gray-700/50">
                <button
                  onClick={() => setExpandedId(isExpanded ? null : v.id)}
                  className="w-full text-left p-3 flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className={`text-xs font-bold px-2 py-0.5 rounded ${
                      v.severity === 'CRITICAL' ? 'text-red-400 bg-red-400/10' :
                      v.severity === 'MEDIUM' ? 'text-orange-400 bg-orange-400/10' :
                      'text-yellow-400 bg-yellow-400/10'
                    }`}>
                      {v.severity}
                    </span>
                    <span className="text-sm font-bold text-white truncate">
                      {scenario?.title.split(': ')[1] ?? v.proposal?.description?.slice(0, 40) ?? 'Unknown'}
                    </span>
                    <span className="text-xs text-gray-500">{agentName}</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`text-xs font-bold px-2 py-0.5 rounded ${layerMeta.bg} ${layerMeta.color} border ${layerMeta.border}`}>
                      {layerMeta.label}
                    </span>
                    <svg
                      className={`w-4 h-4 text-gray-500 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                      fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </button>

                {isExpanded && (
                  <div className="px-3 pb-3 space-y-2 border-t border-gray-700/50 pt-2">
                    {scenario && (
                      <p className="text-xs text-gray-400">{scenario.attackType}</p>
                    )}
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-gray-500">Model 1:</span>{' '}
                        <span className="text-red-400 font-bold">{v.model1.verdict}</span>{' '}
                        <span className="text-gray-500">{v.model1.confidence}%</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Model 2:</span>{' '}
                        <span className="text-red-400 font-bold">{v.model2.verdict}</span>{' '}
                        <span className="text-gray-500">{v.model2.confidence}%</span>
                      </div>
                    </div>
                    <p className="text-xs text-gray-400">
                      {v.model1.reason}
                    </p>
                    {v.anomalyScore != null && (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-500">Anomaly Score:</span>
                        <span className={`text-xs font-bold px-2 py-0.5 rounded ${
                          v.anomalyScore >= threshold ? 'text-red-400 bg-red-400/10' :
                          v.anomalyScore >= 25 ? 'text-orange-400 bg-orange-400/10' :
                          'text-green-400 bg-green-400/10'
                        }`}>
                          {v.anomalyScore}/100
                        </span>
                      </div>
                    )}
                    {v.anomalyDimensions && v.anomalyDimensions.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {v.anomalyDimensions.filter((d) => d.fired).map((d) => (
                          <span key={d.name} className="text-xs text-orange-400 bg-orange-400/10 px-1.5 py-0.5 rounded">
                            {d.name} +{d.score}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
