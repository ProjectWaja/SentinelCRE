'use client'

import type { VerdictEntry } from '@/hooks/useVerdictHistory'

export default function VerdictFeedPanel({
  verdicts,
  onClear,
}: {
  verdicts: VerdictEntry[]
  onClear: () => void
}) {
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
            return (
              <div
                key={v.id}
                className="animate-verdict bg-gray-800/50 rounded-lg border border-gray-700/50 overflow-hidden"
              >
                <div
                  className={`flex items-center justify-between p-4 ${
                    isDenied ? 'border-l-4 border-l-red-500' : 'border-l-4 border-l-green-500'
                  }`}
                >
                  <div className="flex-1">
                    <p className="text-sm text-gray-300 mb-2">
                      {v.proposal?.description ?? 'Unknown action'}
                    </p>
                    <div className="flex gap-3 text-xs">
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
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      {v.model1.reason}
                    </p>
                  </div>
                  <div className="ml-4 text-right">
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
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
