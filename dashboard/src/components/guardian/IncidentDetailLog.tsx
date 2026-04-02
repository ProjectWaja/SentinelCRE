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
        <h2 className="text-2xl font-black text-white uppercase tracking-widest">
          Incident Log
        </h2>
        <span className="text-base font-bold text-red-400 bg-red-400/10 px-3 py-1 rounded-full border border-red-400/30">
          {incidents.length} incidents
        </span>
      </div>

      {/* Filter pills */}
      <div className="flex flex-wrap gap-2 mb-4">
        {filters.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`text-base font-bold px-3 py-1.5 rounded-full border transition-colors ${
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
        <div className="text-center py-8 space-y-3">
          <div className="w-14 h-14 mx-auto rounded-xl bg-gray-800/50 border border-gray-700/50 flex items-center justify-center">
            <svg className="w-7 h-7 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
            </svg>
          </div>
          <p className="text-base text-gray-500">
            {incidents.length === 0
              ? 'No incidents recorded yet'
              : 'No incidents match this filter'}
          </p>
          {incidents.length === 0 && (
            <p className="text-base text-gray-500">Attack scenarios from the Live Demo will appear here as incidents</p>
          )}
        </div>
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
                    <span className={`text-base font-bold px-2 py-0.5 rounded ${
                      v.severity === 'CRITICAL' ? 'text-red-400 bg-red-400/10' :
                      v.severity === 'MEDIUM' ? 'text-orange-400 bg-orange-400/10' :
                      'text-yellow-400 bg-yellow-400/10'
                    }`}>
                      {v.severity}
                    </span>
                    <span className="text-lg font-bold text-white truncate">
                      {scenario?.title.split(': ')[1] ?? v.proposal?.description?.slice(0, 40) ?? 'Unknown'}
                    </span>
                    <span className="text-base text-gray-500">{agentName}</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`text-base font-bold px-2 py-0.5 rounded ${layerMeta.bg} ${layerMeta.color} border ${layerMeta.border}`}>
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
                      <p className="text-base text-gray-400">{scenario.attackType}</p>
                    )}
                    <div className="grid grid-cols-2 gap-2 text-base">
                      <div>
                        <span className="text-gray-500">Model 1:</span>{' '}
                        <span className="text-red-400 font-bold">{v.model1.verdict}</span>{' '}
                      </div>
                      <div>
                        <span className="text-gray-500">Model 2:</span>{' '}
                        <span className="text-red-400 font-bold">{v.model2.verdict}</span>
                      </div>
                    </div>
                    <p className="text-base text-gray-400">
                      {v.model1.reason}
                    </p>
                    {v.anomalyScore != null && (
                      <div className="flex items-center gap-2">
                        <span className="text-base text-gray-500">Anomaly Score:</span>
                        <span className={`text-base font-bold px-2 py-0.5 rounded ${
                          v.anomalyScore >= threshold ? 'text-red-400 bg-red-400/10' :
                          v.anomalyScore >= 25 ? 'text-orange-400 bg-orange-400/10' :
                          'text-green-400 bg-green-400/10'
                        }`}>
                          {v.anomalyFlagged ? 'FLAGGED' : 'NORMAL'}
                        </span>
                      </div>
                    )}
                    {v.anomalyDimensions && v.anomalyDimensions.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {v.anomalyDimensions.filter((d) => d.fired).map((d) => (
                          <span key={d.name} className="text-base text-orange-400 bg-orange-400/10 px-1.5 py-0.5 rounded">
                            {d.name}
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
