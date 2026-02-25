'use client'

import { useState } from 'react'
import {
  matchScenario,
  getDefenseLayer,
  DEFENSE_LAYER_META,
} from '@/lib/guardian-data'
import type { VerdictEntry } from '@/hooks/useVerdictHistory'

const SEVERITY_BADGE: Record<string, { bg: string; text: string; border: string }> = {
  LOW: { bg: 'bg-green-400/10', text: 'text-green-400', border: 'border-green-400/30' },
  MEDIUM: { bg: 'bg-yellow-400/10', text: 'text-yellow-400', border: 'border-yellow-400/30' },
  CRITICAL: { bg: 'bg-red-400/10', text: 'text-red-400', border: 'border-red-400/30' },
}

function deriveAgentName(agentId: string | undefined): string {
  if (!agentId) return 'Unknown Agent'
  if (agentId.endsWith('01')) return 'TradingBot'
  if (agentId.endsWith('02')) return 'MintBot'
  return 'Agent'
}

function formatTime(timestamp: number): string {
  const d = new Date(timestamp)
  return d.toLocaleTimeString('en-US', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

function truncate(str: string, max: number): string {
  if (str.length <= max) return str
  return str.slice(0, max) + '...'
}

interface PhaseDividerProps {
  label: string
}

function PhaseDivider({ label }: PhaseDividerProps) {
  return (
    <div className="relative flex items-center py-4">
      <div className="absolute left-[5px] w-3 h-3 rounded-full bg-gray-600 border-2 border-gray-500 z-10" />
      <div className="ml-10 flex items-center gap-3 w-full">
        <span className="text-base font-black uppercase tracking-[0.2em] text-gray-500 whitespace-nowrap">
          {label}
        </span>
        <div className="flex-1 h-px bg-gray-700" />
      </div>
    </div>
  )
}

export default function ThreatTimeline({
  sessionVerdicts,
}: {
  sessionVerdicts: VerdictEntry[]
}) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())

  const toggleExpanded = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  // Reverse to get chronological order (newest first in array, so reverse for oldest-first)
  const chronological = [...sessionVerdicts].reverse()

  // Determine where to insert phase dividers
  // We need to detect transitions between safe (id <= 0) and attack (id > 0) scenarios
  let insertedBaselineDivider = false
  let insertedAttackDivider = false

  type TimelineItem =
    | { type: 'divider'; label: string; key: string }
    | { type: 'verdict'; verdict: VerdictEntry }

  const items: TimelineItem[] = []

  for (const v of chronological) {
    const scenario = matchScenario(v)
    const scenarioId = scenario?.id ?? null
    const isAttack = scenarioId !== null && scenarioId > 0
    const isSafe = scenarioId !== null && scenarioId <= 0

    if (isSafe && !insertedBaselineDivider) {
      insertedBaselineDivider = true
      items.push({ type: 'divider', label: 'BASELINE TRAINING', key: 'div-baseline' })
    }

    if (isAttack && !insertedAttackDivider) {
      insertedAttackDivider = true
      items.push({ type: 'divider', label: 'ATTACK SCENARIOS', key: 'div-attack' })
    }

    items.push({ type: 'verdict', verdict: v })
  }

  return (
    <div className="bg-gray-900 rounded-2xl border border-gray-800 p-6">
      <h2 className="text-2xl font-black text-white uppercase tracking-widest mb-6">
        Threat Timeline
      </h2>

      {sessionVerdicts.length === 0 ? (
        <div className="text-center py-12 space-y-4">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-gray-800/50 border border-gray-700/50 flex items-center justify-center">
            <svg className="w-8 h-8 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-lg text-gray-500">No events recorded yet</p>
          <p className="text-base text-gray-500">Run the Live Demo to see threats detected in real-time</p>
        </div>
      ) : (
        <div className="relative">
          {/* Vertical timeline line */}
          <div className="absolute left-[11px] top-0 bottom-0 w-0.5 bg-gray-800" />

          <div className="space-y-0">
            {items.map((item) => {
              if (item.type === 'divider') {
                return <PhaseDivider key={item.key} label={item.label} />
              }

              const v = item.verdict
              const isDenied = v.consensus === 'DENIED'
              const scenario = matchScenario(v)
              const title = scenario?.title ?? truncate(v.proposal?.description ?? 'Unknown action', 60)
              const agentName = deriveAgentName(v.proposal?.agentId)
              const isExpanded = expandedIds.has(v.id)
              const sevStyle = v.severity ? SEVERITY_BADGE[v.severity] : null

              return (
                <div key={v.id} className="relative flex items-start py-2">
                  {/* Timeline dot */}
                  <div
                    className={`relative z-10 mt-1.5 w-[10px] h-[10px] rounded-full border-2 shrink-0 ${
                      isDenied
                        ? 'bg-red-400 border-red-400'
                        : 'bg-green-400 border-green-400'
                    }`}
                    style={{ marginLeft: '6px' }}
                  />

                  {/* Content card */}
                  <div className="ml-5 flex-1 min-w-0">
                    <div
                      className={`bg-gray-800/50 rounded-lg border p-4 ${
                        isDenied
                          ? 'border-red-500/20'
                          : 'border-gray-700/50'
                      }`}
                    >
                      {/* Title row */}
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <p className="text-base font-bold text-white leading-tight">
                          {title}
                        </p>
                        <span className="text-base text-gray-500 whitespace-nowrap font-mono">
                          {formatTime(v.timestamp)}
                        </span>
                      </div>

                      {/* Badges row */}
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <span
                          className={`px-2 py-0.5 rounded text-base font-bold ${
                            isDenied
                              ? 'bg-red-400/10 text-red-400'
                              : 'bg-green-400/10 text-green-400'
                          }`}
                        >
                          {isDenied ? 'BLOCKED' : 'APPROVED'}
                        </span>
                        {isDenied && sevStyle && v.severity && (
                          <span
                            className={`px-2 py-0.5 rounded border text-base font-bold ${sevStyle.bg} ${sevStyle.text} ${sevStyle.border}`}
                          >
                            {v.severity}
                          </span>
                        )}
                      </div>

                      {/* Agent name */}
                      <p className="text-base text-gray-500">
                        Agent: <span className="text-gray-400 font-semibold">{agentName}</span>
                      </p>

                      {/* Expandable details for DENIED verdicts */}
                      {isDenied && (
                        <div className="mt-3">
                          <button
                            onClick={() => toggleExpanded(v.id)}
                            className="text-base text-gray-500 hover:text-gray-300 transition-colors font-semibold flex items-center gap-1"
                          >
                            <svg
                              className={`w-3 h-3 transition-transform ${
                                isExpanded ? 'rotate-90' : ''
                              }`}
                              fill="currentColor"
                              viewBox="0 0 20 20"
                            >
                              <path
                                fillRule="evenodd"
                                d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                                clipRule="evenodd"
                              />
                            </svg>
                            {isExpanded ? 'Hide details' : 'Show details'}
                          </button>

                          {isExpanded && (
                            <div className="mt-3 space-y-2 text-base">
                              {/* Defense layer */}
                              {(() => {
                                const layer = getDefenseLayer(v)
                                const meta = DEFENSE_LAYER_META[layer]
                                return (
                                  <div className="flex items-center gap-2">
                                    <span className="text-gray-500">Caught by:</span>
                                    <span
                                      className={`px-2 py-0.5 rounded border font-bold ${meta.bg} ${meta.color} ${meta.border}`}
                                    >
                                      {meta.label}
                                    </span>
                                  </div>
                                )
                              })()}

                              {/* AI Model 1 */}
                              <div className="bg-gray-900/50 rounded p-2.5 border border-gray-700/30">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="text-gray-400 font-semibold">AI Model 1 (Claude):</span>
                                  <span
                                    className={`font-bold ${
                                      v.model1.verdict === 'DENIED'
                                        ? 'text-red-400'
                                        : 'text-green-400'
                                    }`}
                                  >
                                    {v.model1.verdict}
                                  </span>
                                  <span className="text-gray-500">
                                    {v.model1.confidence}%
                                  </span>
                                </div>
                                <p className="text-gray-500 leading-relaxed">
                                  {v.model1.reason}
                                </p>
                              </div>

                              {/* AI Model 2 */}
                              <div className="bg-gray-900/50 rounded p-2.5 border border-gray-700/30">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="text-gray-400 font-semibold">AI Model 2 (GPT-4):</span>
                                  <span
                                    className={`font-bold ${
                                      v.model2.verdict === 'DENIED'
                                        ? 'text-red-400'
                                        : 'text-green-400'
                                    }`}
                                  >
                                    {v.model2.verdict}
                                  </span>
                                  <span className="text-gray-500">
                                    {v.model2.confidence}%
                                  </span>
                                </div>
                                <p className="text-gray-500 leading-relaxed">
                                  {v.model2.reason}
                                </p>
                              </div>

                              {/* Anomaly Score */}
                              {v.anomalyScore != null && (
                                <div className="flex items-center gap-2">
                                  <span className="text-gray-500">Anomaly Score:</span>
                                  <span
                                    className={`px-2 py-0.5 rounded font-bold ${
                                      v.anomalyFlagged
                                        ? 'bg-orange-400/10 text-orange-400 border border-orange-400/30'
                                        : v.anomalyScore >= 50
                                          ? 'bg-yellow-400/10 text-yellow-400 border border-yellow-400/30'
                                          : 'bg-gray-700/50 text-gray-400 border border-gray-600/30'
                                    }`}
                                  >
                                    {v.anomalyScore}/100
                                  </span>
                                  {v.anomalyFlagged && (
                                    <span className="text-orange-400 font-bold">FLAGGED</span>
                                  )}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
