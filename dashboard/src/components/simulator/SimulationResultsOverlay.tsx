'use client'

import GasProfilePanel from '../GasProfilePanel'

interface SimulationResponse {
  success: boolean
  gasUsed: number
  revertReason?: string
  stateChanges: Array<{ address: string; key: string; before: string; after: string }>
  balanceChanges: Array<{ address: string; before: string; after: string; diff: string }>
  callTrace: any
  logs: Array<{ address: string; decoded?: { name: string; args: Record<string, string> } }>
}

export default function SimulationResultsOverlay({
  result,
  scenarioLabel,
  variant,
}: {
  result: SimulationResponse
  scenarioLabel: string | null
  variant: 'safe' | 'attack' | null
}) {
  return (
    <div className="animate-verdict">
      {/* Banner */}
      {scenarioLabel && (
        <div className={`rounded-xl p-4 mb-5 flex items-center justify-between ${
          result.success
            ? 'bg-green-500/10 border border-green-500/30'
            : 'bg-red-500/10 border border-red-500/30'
        }`}>
          <div className="flex items-center gap-3">
            <span className={`text-sm px-3 py-1 rounded-full font-bold ${
              variant === 'attack' ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'
            }`}>
              {variant === 'attack' ? 'ATTACK' : 'SAFE'}
            </span>
            <span className="text-base font-bold text-white">{scenarioLabel}</span>
          </div>
          <div className="flex items-center gap-4">
            <span className={`text-xl font-black ${result.success ? 'text-green-400' : 'text-red-400'}`}>
              {result.success ? 'SUCCESS' : 'REVERTED'}
            </span>
            <span className="text-base text-gray-400 font-mono">
              {result.gasUsed.toLocaleString()} gas
            </span>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Events + State Changes */}
        <div className="space-y-5">
          {/* Emitted Events */}
          {result.logs.length > 0 && (
            <div className="bg-gray-900 rounded-2xl border border-gray-800 p-6">
              <h3 className="text-lg font-bold text-white mb-4">
                Emitted Events ({result.logs.length})
              </h3>
              <div className="space-y-3 max-h-72 overflow-y-auto">
                {result.logs.map((log, i) => (
                  <div key={i} className="bg-gray-800/50 rounded-xl p-4">
                    <p className="text-base font-semibold text-blue-400">
                      {log.decoded?.name ?? 'Raw Event'}
                    </p>
                    {log.decoded?.args && (
                      <div className="mt-2 space-y-1">
                        {Object.entries(log.decoded.args).map(([k, v]) => (
                          <p key={k} className="text-sm text-gray-500">
                            <span className="text-gray-400">{k}:</span>{' '}
                            <span className="font-mono text-gray-300">
                              {String(v).slice(0, 66)}{String(v).length > 66 ? '...' : ''}
                            </span>
                          </p>
                        ))}
                      </div>
                    )}
                    <p className="text-sm text-gray-600 mt-2 font-mono">
                      {log.address.slice(0, 20)}...
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* State Changes */}
          {result.stateChanges.length > 0 && (
            <div className="bg-gray-900 rounded-2xl border border-gray-800 p-6">
              <h3 className="text-lg font-bold text-white mb-4">
                State Changes ({result.stateChanges.length})
              </h3>
              <div className="space-y-3 max-h-60 overflow-y-auto">
                {result.stateChanges.map((sc, i) => (
                  <div key={i} className="bg-gray-800/50 rounded-xl p-4">
                    <p className="text-sm text-gray-500 font-mono">
                      {sc.address.slice(0, 16)}... / {sc.key}
                    </p>
                    <div className="flex gap-3 mt-1 text-sm font-mono">
                      <span className="text-red-400">{sc.before.slice(0, 18)}...</span>
                      <span className="text-gray-600">{'->'}</span>
                      <span className="text-green-400">{sc.after.slice(0, 18)}...</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {result.logs.length === 0 && result.stateChanges.length === 0 && (
            <div className="bg-gray-900 rounded-2xl border border-gray-800 p-6">
              <p className="text-base text-gray-500">
                {result.success
                  ? 'Transaction succeeded with no events or state changes'
                  : 'Transaction reverted — no state changes applied'}
              </p>
            </div>
          )}
        </div>

        {/* Right: Gas Profile */}
        <div>
          <GasProfilePanel callTrace={result.callTrace} totalGas={result.gasUsed} />
        </div>
      </div>
    </div>
  )
}
