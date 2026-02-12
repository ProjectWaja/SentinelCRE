'use client'

import { useState } from 'react'
import type { VerdictEntry } from '@/hooks/useVerdictHistory'

const SEVERITY_STYLES = {
  LOW: { label: 'Low', bg: 'bg-green-400/10', text: 'text-green-400', border: 'border-green-400/30' },
  MEDIUM: { label: 'Medium', bg: 'bg-yellow-400/10', text: 'text-yellow-400', border: 'border-yellow-400/30' },
  CRITICAL: { label: 'Critical', bg: 'bg-red-400/10', text: 'text-red-400', border: 'border-red-400/30' },
} as const

export default function VerdictFeedPanel({
  verdicts,
  onClear,
}: {
  verdicts: VerdictEntry[]
  onClear: () => void
}) {
  const [appealingIds, setAppealingIds] = useState<Set<string>>(new Set())
  const [appealResults, setAppealResults] = useState<Record<string, { verdict: string; reason: string }>>({})

  async function handleAppeal(v: VerdictEntry) {
    setAppealingIds((prev) => new Set(prev).add(v.id))
    try {
      const res = await fetch('/api/challenge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ proposal: v.proposal }),
      })
      const result = await res.json()
      setAppealResults((prev) => ({
        ...prev,
        [v.id]: { verdict: result.verdict, reason: result.reason },
      }))
    } catch {
      setAppealResults((prev) => ({
        ...prev,
        [v.id]: { verdict: 'DENIED', reason: 'Appeal request failed' },
      }))
    }
    setAppealingIds((prev) => {
      const next = new Set(prev)
      next.delete(v.id)
      return next
    })
  }

  return (
    <div className="bg-gray-900 rounded-xl border border-gray-800 p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-white">Verdict Feed</h2>
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-500">
            {verdicts.length} verdicts
          </span>
          {verdicts.length > 0 && (
            <button
              onClick={onClear}
              className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {verdicts.length === 0 ? (
        <p className="text-sm text-gray-500">
          No verdicts yet — use the demo buttons to evaluate actions
        </p>
      ) : (
        <div className="space-y-3 max-h-[500px] overflow-y-auto">
          {verdicts.map((v) => {
            const isDenied = v.consensus === 'DENIED'
            const severity = v.severity
            const sevStyle = severity ? SEVERITY_STYLES[severity] : null
            const isAppealing = appealingIds.has(v.id)
            const appealResult = appealResults[v.id]
            const canAppeal = isDenied && severity && severity !== 'CRITICAL' && !appealResult

            return (
              <div
                key={v.id}
                className="animate-verdict bg-gray-800/50 rounded-lg border border-gray-700/50 overflow-hidden"
              >
                <div
                  className={`p-4 ${
                    isDenied ? 'border-l-4 border-l-red-500' : 'border-l-4 border-l-green-500'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="text-sm text-gray-300 mb-2">
                        {v.proposal?.description ?? 'Unknown action'}
                      </p>
                      <div className="flex flex-wrap gap-2 text-xs">
                        <span
                          className={`px-2 py-0.5 rounded ${
                            v.model1.verdict === 'APPROVED'
                              ? 'text-green-400 bg-green-400/10'
                              : 'text-red-400 bg-red-400/10'
                          }`}
                        >
                          Model 1: {v.model1.verdict} {v.model1.confidence}%
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded ${
                            v.model2.verdict === 'APPROVED'
                              ? 'text-green-400 bg-green-400/10'
                              : 'text-red-400 bg-red-400/10'
                          }`}
                        >
                          Model 2: {v.model2.verdict} {v.model2.confidence}%
                        </span>
                        {sevStyle && (
                          <span
                            className={`px-2 py-0.5 rounded border ${sevStyle.bg} ${sevStyle.text} ${sevStyle.border}`}
                          >
                            {sevStyle.label} Severity
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        {v.model1.reason}
                      </p>
                    </div>
                    <div className="ml-4 text-right shrink-0">
                      <span
                        className={`text-lg font-bold ${
                          isDenied ? 'text-red-400' : 'text-green-400'
                        }`}
                      >
                        {v.consensus}
                      </span>
                      <p className="text-xs text-gray-600">
                        {new Date(v.timestamp).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>

                  {/* Challenge / Appeal Section */}
                  {isDenied && severity && (
                    <div className="mt-3 pt-3 border-t border-gray-700/50">
                      {severity === 'CRITICAL' ? (
                        <div className="flex items-center gap-2 text-xs text-red-400/70">
                          <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                          </svg>
                          No Appeal — Critical severity, agent frozen permanently
                        </div>
                      ) : appealResult ? (
                        <div
                          className={`flex items-center justify-between text-xs rounded p-2 ${
                            appealResult.verdict === 'APPROVED'
                              ? 'bg-green-400/10 text-green-400'
                              : 'bg-red-400/10 text-red-400'
                          }`}
                        >
                          <span>
                            Appeal {appealResult.verdict === 'APPROVED' ? 'Overturned' : 'Upheld'}: {appealResult.reason}
                          </span>
                          <span className="font-bold ml-2">
                            {appealResult.verdict === 'APPROVED' ? 'UNFROZEN' : 'STAYS FROZEN'}
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-500">
                            Challenge window open — {severity === 'LOW' ? '1 hour' : '30 min'} to appeal
                          </span>
                          <button
                            onClick={() => handleAppeal(v)}
                            disabled={isAppealing}
                            className="text-xs bg-yellow-600 hover:bg-yellow-700 disabled:bg-gray-700 text-white px-3 py-1 rounded transition-colors flex items-center gap-1.5"
                          >
                            {isAppealing ? (
                              <>
                                <span className="w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                                Re-evaluating...
                              </>
                            ) : (
                              'Appeal'
                            )}
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
