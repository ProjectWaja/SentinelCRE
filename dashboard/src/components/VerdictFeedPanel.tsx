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
    <div className="bg-gray-900 rounded-2xl border border-gray-800 p-8">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-2xl font-black text-white uppercase tracking-widest">Verdict Feed</h2>
        <div className="flex items-center gap-3">
          <span className="text-base text-gray-500 font-semibold">
            {verdicts.length} verdicts
          </span>
          {verdicts.length > 0 && (
            <button
              onClick={onClear}
              className="text-base text-gray-500 hover:text-gray-300 transition-colors font-semibold"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {verdicts.length === 0 ? (
        <div className="text-center py-8 space-y-3">
          <div className="w-12 h-12 mx-auto rounded-xl bg-gray-800/50 border border-gray-700/50 flex items-center justify-center">
            <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25z" />
            </svg>
          </div>
          <p className="text-base text-gray-500">No verdicts yet</p>
          <p className="text-base text-gray-500">Run scenarios to see verdict history</p>
        </div>
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
                  className={`p-5 ${
                    isDenied ? 'border-l-4 border-l-red-500' : 'border-l-4 border-l-green-500'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="text-base text-gray-300 mb-2 font-semibold">
                        {v.proposal?.description ?? 'Unknown action'}
                      </p>
                      <div className="flex flex-wrap gap-2 text-base">
                        <span
                          className={`px-3 py-1 rounded font-bold ${
                            v.model1.verdict === 'APPROVED'
                              ? 'text-green-400 bg-green-400/10'
                              : 'text-red-400 bg-red-400/10'
                          }`}
                        >
                          Claude: {v.model1.verdict}
                        </span>
                        <span
                          className={`px-3 py-1 rounded font-bold ${
                            v.model2.verdict === 'APPROVED'
                              ? 'text-green-400 bg-green-400/10'
                              : 'text-red-400 bg-red-400/10'
                          }`}
                        >
                          GPT-4: {v.model2.verdict}
                        </span>
                        {sevStyle && (
                          <span
                            className={`px-3 py-1 rounded border font-bold ${sevStyle.bg} ${sevStyle.text} ${sevStyle.border}`}
                          >
                            {sevStyle.label} Severity
                          </span>
                        )}
                        {v.anomalyScore != null && (
                          <span
                            className={`px-3 py-1 rounded border font-bold ${
                              v.anomalyFlagged
                                ? 'bg-orange-400/10 text-orange-400 border-orange-400/30'
                                : 'bg-gray-700/50 text-gray-400 border-gray-600/30'
                            }`}
                          >
                            Risk: {v.anomalyFlagged ? 'FLAGGED' : 'NORMAL'}
                          </span>
                        )}
                      </div>
                      <p className="text-base text-gray-500 mt-2">
                        {v.model1.reason}
                      </p>
                    </div>
                    <div className="ml-4 text-right shrink-0">
                      <span
                        className={`text-2xl font-black ${
                          isDenied ? 'text-red-400' : 'text-green-400'
                        }`}
                      >
                        {v.consensus}
                      </span>
                      <p className="text-base text-gray-500">
                        {new Date(v.timestamp).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>

                  {/* Challenge / Appeal Section */}
                  {isDenied && severity && (
                    <div className="mt-3 pt-3 border-t border-gray-700/50">
                      {severity === 'CRITICAL' ? (
                        <div className="flex items-center gap-2 text-base text-red-400/70 font-semibold">
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                          </svg>
                          No Appeal — Critical severity, agent frozen permanently
                        </div>
                      ) : appealResult ? (
                        <div
                          className={`flex items-center justify-between text-base rounded p-3 font-semibold ${
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
                          <span className="text-base text-gray-500">
                            Challenge window open — {severity === 'LOW' ? '1 hour' : '30 min'} to appeal
                          </span>
                          <button
                            onClick={() => handleAppeal(v)}
                            disabled={isAppealing}
                            className="text-base bg-yellow-600 hover:bg-yellow-700 disabled:bg-gray-700 text-white px-4 py-1.5 rounded transition-colors flex items-center gap-2 font-bold"
                          >
                            {isAppealing ? (
                              <>
                                <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
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
