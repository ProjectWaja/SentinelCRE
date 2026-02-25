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
  const clampedVal = Math.max(min, Math.min(max, val))
  return (Math.log(clampedVal / min) / Math.log(max / min)) * 100
}

function sliderToValue(pos: number, min: number, max: number): number {
  return min * Math.pow(max / min, pos / 100)
}

function formatEth(val: number): string {
  if (val >= 1000) return `${(val / 1000).toFixed(0)}K ETH`
  if (val >= 10) return `${Math.round(val)} ETH`
  if (val >= 1) return `${val.toFixed(1)} ETH`
  return `${val.toFixed(2)} ETH`
}

function formatTokens(val: number): string {
  if (val >= 1_000_000) return `${(val / 1_000_000).toFixed(1)}M`
  if (val >= 1_000) return `${(val / 1_000).toFixed(0)}K`
  return `${val}`
}

function formatDuration(seconds: number): string {
  if (seconds >= 86400) return `${Math.round(seconds / 86400)}d`
  if (seconds >= 3600) return `${Math.round(seconds / 3600)}h`
  return `${Math.round(seconds / 60)}m`
}

export function isPolicyModified(overrides: PolicyOverrides, baseline?: PolicyOverrides): boolean {
  const base = baseline ?? DEFAULT_POLICY
  return (
    overrides.valueCheckEnabled !== base.valueCheckEnabled ||
    overrides.mintCheckEnabled !== base.mintCheckEnabled ||
    overrides.targetWhitelistEnabled !== base.targetWhitelistEnabled ||
    overrides.functionBlocklistEnabled !== base.functionBlocklistEnabled ||
    overrides.maxValueEth !== base.maxValueEth ||
    overrides.maxMintTokens !== base.maxMintTokens ||
    overrides.anomalyThreshold !== base.anomalyThreshold ||
    overrides.rateLimitEnabled !== base.rateLimitEnabled ||
    overrides.rateLimit !== base.rateLimit ||
    overrides.rateLimitWindow !== base.rateLimitWindow ||
    overrides.dailyVolumeEnabled !== base.dailyVolumeEnabled ||
    overrides.dailyVolumeEth !== base.dailyVolumeEth ||
    overrides.porEnabled !== base.porEnabled ||
    overrides.minReserveRatio !== base.minReserveRatio ||
    overrides.maxStaleness !== base.maxStaleness
  )
}

export default function PolicyEditor({
  overrides,
  onChange,
  disabled,
  agentName,
  baselinePolicy,
}: {
  overrides: PolicyOverrides
  onChange: (o: PolicyOverrides) => void
  disabled: boolean
  agentName?: string
  baselinePolicy?: PolicyOverrides
}) {
  const modified = isPolicyModified(overrides, baselinePolicy)

  const update = (partial: Partial<PolicyOverrides>) => {
    onChange({ ...overrides, ...partial })
  }

  return (
    <details className="bg-gray-900 rounded-2xl border border-gray-800">
      <summary className="p-5 cursor-pointer select-none flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-xl font-bold uppercase tracking-wider text-gray-300">
            {agentName ? `Policy — ${agentName}` : 'Policy Configuration'}
          </span>
          <span className="text-base px-3 py-1 rounded-full bg-orange-500/10 text-orange-400 border border-orange-500/20 font-semibold">
            WHAT-IF
          </span>
          {modified && (
            <span className="text-base px-3 py-1 rounded-full bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 font-semibold">
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
        <p className="text-base text-gray-400 mb-4">
          Toggle checks on/off and adjust thresholds to see how each defense layer responds independently.
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Layer 1: On-Chain Policy */}
          <div className="bg-gray-800/50 rounded-xl border border-gray-700/50 p-5">
            <h4 className="text-lg font-bold text-green-400 uppercase tracking-wider mb-4">
              Layer 1 — On-Chain Policy
            </h4>

            <div className="space-y-4">
              {/* Value Limit */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-lg text-gray-300 font-medium">Value Limit</label>
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
                      value={valueToSlider(overrides.maxValueEth, 0.1, 100000)}
                      onChange={(e) =>
                        update({
                          maxValueEth: Math.round(sliderToValue(Number(e.target.value), 0.1, 100000) * 100) / 100,
                        })
                      }
                      disabled={disabled}
                      className="flex-1 h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-red-500 disabled:opacity-50"
                    />
                    <span className="text-lg font-mono text-white w-20 text-right">
                      {formatEth(overrides.maxValueEth)}
                    </span>
                  </div>
                )}
              </div>

              {/* Mint Cap */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-lg text-gray-300 font-medium">Mint Cap</label>
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
                      value={valueToSlider(overrides.maxMintTokens, 1_000, 100_000_000)}
                      onChange={(e) =>
                        update({
                          maxMintTokens: Math.round(sliderToValue(Number(e.target.value), 1_000, 100_000_000)),
                        })
                      }
                      disabled={disabled}
                      className="flex-1 h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-red-500 disabled:opacity-50"
                    />
                    <span className="text-lg font-mono text-white w-20 text-right">
                      {formatTokens(overrides.maxMintTokens)}
                    </span>
                  </div>
                )}
              </div>

              {/* Target Whitelist */}
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-lg text-gray-300 font-medium">Target Whitelist</label>
                  <p className="text-base text-gray-400">Only approved contracts</p>
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
                  <label className="text-lg text-gray-300 font-medium">Function Blocklist</label>
                  <p className="text-base text-gray-400">Block upgradeTo, transferOwnership</p>
                </div>
                <Toggle
                  enabled={overrides.functionBlocklistEnabled}
                  onChange={(v) => update({ functionBlocklistEnabled: v })}
                  disabled={disabled}
                />
              </div>

              {/* Rate Limiting */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-lg text-gray-300 font-medium">Rate Limiting</label>
                  <Toggle
                    enabled={overrides.rateLimitEnabled}
                    onChange={(v) => update({ rateLimitEnabled: v })}
                    disabled={disabled}
                  />
                </div>
                {overrides.rateLimitEnabled && (
                  <div className="space-y-2 mt-2">
                    <div className="flex items-center gap-3">
                      <input
                        type="range"
                        min={0}
                        max={100}
                        value={valueToSlider(overrides.rateLimit, 1, 1000)}
                        onChange={(e) =>
                          update({ rateLimit: Math.round(sliderToValue(Number(e.target.value), 1, 1000)) })
                        }
                        disabled={disabled}
                        className="flex-1 h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-red-500 disabled:opacity-50"
                      />
                      <span className="text-lg font-mono text-white w-20 text-right">
                        {overrides.rateLimit} ops
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <input
                        type="range"
                        min={0}
                        max={100}
                        value={valueToSlider(overrides.rateLimitWindow, 60, 86400)}
                        onChange={(e) =>
                          update({ rateLimitWindow: Math.round(sliderToValue(Number(e.target.value), 60, 86400)) })
                        }
                        disabled={disabled}
                        className="flex-1 h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-red-500 disabled:opacity-50"
                      />
                      <span className="text-lg font-mono text-white w-20 text-right">
                        / {formatDuration(overrides.rateLimitWindow)}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Daily Volume */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-lg text-gray-300 font-medium">Daily Volume Cap</label>
                  <Toggle
                    enabled={overrides.dailyVolumeEnabled}
                    onChange={(v) => update({ dailyVolumeEnabled: v })}
                    disabled={disabled}
                  />
                </div>
                {overrides.dailyVolumeEnabled && (
                  <div className="flex items-center gap-3 mt-2">
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={valueToSlider(overrides.dailyVolumeEth, 1, 100000)}
                      onChange={(e) =>
                        update({
                          dailyVolumeEth: Math.round(sliderToValue(Number(e.target.value), 1, 100000)),
                        })
                      }
                      disabled={disabled}
                      className="flex-1 h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-red-500 disabled:opacity-50"
                    />
                    <span className="text-lg font-mono text-white w-20 text-right">
                      {formatEth(overrides.dailyVolumeEth)}/d
                    </span>
                  </div>
                )}
              </div>

              {/* Proof of Reserves */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <div>
                    <label className="text-lg text-gray-300 font-medium">Proof of Reserves</label>
                    <p className="text-base text-blue-400">Chainlink PoR</p>
                  </div>
                  <Toggle
                    enabled={overrides.porEnabled}
                    onChange={(v) => update({ porEnabled: v })}
                    disabled={disabled}
                  />
                </div>
                {overrides.porEnabled && (
                  <div className="space-y-2 mt-2">
                    <div className="flex items-center gap-3">
                      <span className="text-base text-gray-400 w-14">Ratio</span>
                      <input
                        type="range"
                        min={5000}
                        max={15000}
                        step={100}
                        value={overrides.minReserveRatio}
                        onChange={(e) => update({ minReserveRatio: Number(e.target.value) })}
                        disabled={disabled}
                        className="flex-1 h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500 disabled:opacity-50"
                      />
                      <span className="text-lg font-mono text-white w-16 text-right">
                        {(overrides.minReserveRatio / 100).toFixed(0)}%
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-base text-gray-400 w-14">Fresh</span>
                      <input
                        type="range"
                        min={0}
                        max={100}
                        value={valueToSlider(overrides.maxStaleness, 60, 7200)}
                        onChange={(e) =>
                          update({ maxStaleness: Math.round(sliderToValue(Number(e.target.value), 60, 7200)) })
                        }
                        disabled={disabled}
                        className="flex-1 h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500 disabled:opacity-50"
                      />
                      <span className="text-lg font-mono text-white w-16 text-right">
                        {formatDuration(overrides.maxStaleness)}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Layer 2: Behavioral + Layer 3 info */}
          <div className="space-y-4">
            <div className="bg-gray-800/50 rounded-xl border border-gray-700/50 p-5">
              <h4 className="text-lg font-bold text-yellow-400 uppercase tracking-wider mb-4">
                Layer 2 — Behavioral Scoring
              </h4>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-lg text-gray-300 font-medium">Anomaly Threshold</label>
                  <span className="text-lg font-mono text-white">
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
                <div className="flex justify-between text-base text-gray-400 mt-1">
                  <span>20 (strict)</span>
                  <span>50 (default)</span>
                  <span>100 (off)</span>
                </div>
              </div>
            </div>

            <div className="bg-gray-800/50 rounded-xl border border-gray-700/50 p-5">
              <h4 className="text-lg font-bold text-purple-400 uppercase tracking-wider mb-2">
                Layer 3 — Dual-AI Consensus
              </h4>
              <p className="text-lg text-gray-400">
                Always active. Both AI models must independently approve — cannot be disabled.
              </p>
            </div>

            {/* Active checks summary */}
            <div className="bg-gray-800/50 rounded-xl border border-gray-700/50 p-4">
              <h4 className="text-base font-bold text-gray-400 uppercase tracking-wider mb-2">
                Active Checks
              </h4>
              <div className="flex flex-wrap gap-1.5">
                {overrides.valueCheckEnabled && (
                  <span className="text-base px-3 py-0.5 rounded bg-green-500/10 text-green-400 border border-green-500/20">Val</span>
                )}
                {overrides.mintCheckEnabled && (
                  <span className="text-base px-3 py-0.5 rounded bg-green-500/10 text-green-400 border border-green-500/20">Mint</span>
                )}
                {overrides.targetWhitelistEnabled && (
                  <span className="text-base px-3 py-0.5 rounded bg-green-500/10 text-green-400 border border-green-500/20">Wht</span>
                )}
                {overrides.functionBlocklistEnabled && (
                  <span className="text-base px-3 py-0.5 rounded bg-green-500/10 text-green-400 border border-green-500/20">Fn</span>
                )}
                {overrides.rateLimitEnabled && (
                  <span className="text-base px-3 py-0.5 rounded bg-green-500/10 text-green-400 border border-green-500/20">Rate</span>
                )}
                {overrides.dailyVolumeEnabled && (
                  <span className="text-base px-3 py-0.5 rounded bg-green-500/10 text-green-400 border border-green-500/20">Vol</span>
                )}
                {overrides.porEnabled && (
                  <span className="text-base px-3 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">PoR</span>
                )}
                <span className="text-base px-3 py-0.5 rounded bg-yellow-500/10 text-yellow-400 border border-yellow-500/20">L2</span>
                <span className="text-base px-3 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20">L3</span>
              </div>
            </div>

            {modified && (
              <button
                onClick={() => onChange(baselinePolicy ?? DEFAULT_POLICY)}
                disabled={disabled}
                className="w-full py-2.5 bg-gray-800 hover:bg-gray-700 disabled:opacity-50 text-gray-400 hover:text-gray-200 text-base font-semibold rounded-xl border border-gray-700 transition-colors"
              >
                Reset to {baselinePolicy ? 'Agent Defaults' : 'Defaults'}
              </button>
            )}
          </div>
        </div>
      </div>
    </details>
  )
}
