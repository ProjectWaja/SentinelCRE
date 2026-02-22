'use client'

import { DEFAULT_POLICY, type PolicyOverrides } from '@/lib/demo-scenarios'

function Toggle({
  enabled,
  onChange,
  disabled,
}: {
  enabled: boolean
  onChange: (v: boolean) => void
  disabled: boolean
}) {
  return (
    <button
      onClick={() => !disabled && onChange(!enabled)}
      disabled={disabled}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
        enabled ? 'bg-red-500' : 'bg-gray-700'
      } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
    >
      <span
        className={`inline-block h-4 w-4 rounded-full bg-white transition-transform ${
          enabled ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
  )
}

// Logarithmic slider helpers for value range
function valueToSlider(val: number, min: number, max: number): number {
  return (Math.log(val / min) / Math.log(max / min)) * 100
}

function sliderToValue(pos: number, min: number, max: number): number {
  return min * Math.pow(max / min, pos / 100)
}

function formatEth(val: number): string {
  if (val >= 10) return `${Math.round(val)} ETH`
  if (val >= 1) return `${val.toFixed(1)} ETH`
  return `${val.toFixed(2)} ETH`
}

function formatTokens(val: number): string {
  if (val >= 1_000_000) return `${(val / 1_000_000).toFixed(1)}M`
  return `${(val / 1_000).toFixed(0)}K`
}

function isPolicyModified(overrides: PolicyOverrides): boolean {
  return (
    overrides.valueCheckEnabled !== DEFAULT_POLICY.valueCheckEnabled ||
    overrides.mintCheckEnabled !== DEFAULT_POLICY.mintCheckEnabled ||
    overrides.targetWhitelistEnabled !== DEFAULT_POLICY.targetWhitelistEnabled ||
    overrides.functionBlocklistEnabled !== DEFAULT_POLICY.functionBlocklistEnabled ||
    overrides.maxValueEth !== DEFAULT_POLICY.maxValueEth ||
    overrides.maxMintTokens !== DEFAULT_POLICY.maxMintTokens ||
    overrides.anomalyThreshold !== DEFAULT_POLICY.anomalyThreshold
  )
}

export default function PolicyEditor({
  overrides,
  onChange,
  disabled,
}: {
  overrides: PolicyOverrides
  onChange: (o: PolicyOverrides) => void
  disabled: boolean
}) {
  const modified = isPolicyModified(overrides)

  const update = (partial: Partial<PolicyOverrides>) => {
    onChange({ ...overrides, ...partial })
  }

  return (
    <details className="bg-gray-900 rounded-2xl border border-gray-800">
      <summary className="p-5 cursor-pointer select-none flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-base font-bold uppercase tracking-wider text-gray-400">
            Policy Configuration
          </span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-orange-500/10 text-orange-400 border border-orange-500/20 font-semibold">
            WHAT-IF
          </span>
          {modified && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 font-semibold">
              MODIFIED
            </span>
          )}
        </div>
        <svg
          className="w-4 h-4 text-gray-500 transition-transform"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </summary>

      <div className="px-5 pb-5">
        <p className="text-sm text-gray-500 mb-4">
          Toggle checks on/off and adjust thresholds to see how each defense layer responds independently.
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Layer 1: On-Chain Policy */}
          <div className="bg-gray-800/50 rounded-xl border border-gray-700/50 p-5">
            <h4 className="text-sm font-bold text-green-400 uppercase tracking-wider mb-4">
              Layer 1 — On-Chain Policy
            </h4>

            <div className="space-y-4">
              {/* Value Limit */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-sm text-gray-300 font-medium">Value Limit</label>
                  <Toggle
                    enabled={overrides.valueCheckEnabled}
                    onChange={(v) => update({ valueCheckEnabled: v })}
                    disabled={disabled}
                  />
                </div>
                {overrides.valueCheckEnabled && (
                  <div className="flex items-center gap-3 mt-2">
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={valueToSlider(overrides.maxValueEth, 0.1, 100)}
                      onChange={(e) =>
                        update({
                          maxValueEth: Math.round(sliderToValue(Number(e.target.value), 0.1, 100) * 100) / 100,
                        })
                      }
                      disabled={disabled}
                      className="flex-1 h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-red-500 disabled:opacity-50"
                    />
                    <span className="text-sm font-mono text-white w-20 text-right">
                      {formatEth(overrides.maxValueEth)}
                    </span>
                  </div>
                )}
              </div>

              {/* Mint Cap */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-sm text-gray-300 font-medium">Mint Cap</label>
                  <Toggle
                    enabled={overrides.mintCheckEnabled}
                    onChange={(v) => update({ mintCheckEnabled: v })}
                    disabled={disabled}
                  />
                </div>
                {overrides.mintCheckEnabled && (
                  <div className="flex items-center gap-3 mt-2">
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={valueToSlider(overrides.maxMintTokens, 100_000, 100_000_000)}
                      onChange={(e) =>
                        update({
                          maxMintTokens: Math.round(sliderToValue(Number(e.target.value), 100_000, 100_000_000)),
                        })
                      }
                      disabled={disabled}
                      className="flex-1 h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-red-500 disabled:opacity-50"
                    />
                    <span className="text-sm font-mono text-white w-20 text-right">
                      {formatTokens(overrides.maxMintTokens)}
                    </span>
                  </div>
                )}
              </div>

              {/* Target Whitelist */}
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm text-gray-300 font-medium">Target Whitelist</label>
                  <p className="text-xs text-gray-600">Only approved contracts</p>
                </div>
                <Toggle
                  enabled={overrides.targetWhitelistEnabled}
                  onChange={(v) => update({ targetWhitelistEnabled: v })}
                  disabled={disabled}
                />
              </div>

              {/* Function Blocklist */}
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm text-gray-300 font-medium">Function Blocklist</label>
                  <p className="text-xs text-gray-600">Block upgradeTo, transferOwnership</p>
                </div>
                <Toggle
                  enabled={overrides.functionBlocklistEnabled}
                  onChange={(v) => update({ functionBlocklistEnabled: v })}
                  disabled={disabled}
                />
              </div>
            </div>
          </div>

          {/* Layer 2: Behavioral + Layer 3 info */}
          <div className="space-y-4">
            <div className="bg-gray-800/50 rounded-xl border border-gray-700/50 p-5">
              <h4 className="text-sm font-bold text-yellow-400 uppercase tracking-wider mb-4">
                Layer 2 — Behavioral Scoring
              </h4>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm text-gray-300 font-medium">Anomaly Threshold</label>
                  <span className="text-sm font-mono text-white">
                    {overrides.anomalyThreshold}
                  </span>
                </div>
                <input
                  type="range"
                  min={20}
                  max={100}
                  value={overrides.anomalyThreshold}
                  onChange={(e) => update({ anomalyThreshold: Number(e.target.value) })}
                  disabled={disabled}
                  className="w-full h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-yellow-500 disabled:opacity-50"
                />
                <div className="flex justify-between text-xs text-gray-600 mt-1">
                  <span>20 (strict)</span>
                  <span>50 (default)</span>
                  <span>100 (off)</span>
                </div>
              </div>
            </div>

            <div className="bg-gray-800/50 rounded-xl border border-gray-700/50 p-5">
              <h4 className="text-sm font-bold text-purple-400 uppercase tracking-wider mb-2">
                Layer 3 — Dual-AI Consensus
              </h4>
              <p className="text-sm text-gray-500">
                Always active. Both AI models must independently approve — cannot be disabled.
              </p>
            </div>

            {modified && (
              <button
                onClick={() => onChange(DEFAULT_POLICY)}
                disabled={disabled}
                className="w-full py-2.5 bg-gray-800 hover:bg-gray-700 disabled:opacity-50 text-gray-400 hover:text-gray-200 text-sm font-semibold rounded-xl border border-gray-700 transition-colors"
              >
                Reset to Defaults
              </button>
            )}
          </div>
        </div>
      </div>
    </details>
  )
}
