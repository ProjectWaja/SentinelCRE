'use client'

interface CallTraceEntry {
  type: string
  from: string
  to: string
  gasUsed: number
  decodedInput?: string
  error?: string
  calls?: CallTraceEntry[]
}

interface GasBreakdown {
  label: string
  gas: number
  type: string
  depth: number
}

function flattenTrace(trace: CallTraceEntry, depth = 0): GasBreakdown[] {
  const items: GasBreakdown[] = []

  // Gas used by this call (minus child calls)
  const childGas = (trace.calls ?? []).reduce((s, c) => s + c.gasUsed, 0)
  const selfGas = Math.max(0, trace.gasUsed - childGas)

  const label = trace.decodedInput
    ? trace.decodedInput.split('(')[0]
    : `${trace.type} → ${trace.to.slice(0, 10)}...`

  if (selfGas > 0) {
    items.push({ label, gas: selfGas, type: trace.type, depth })
  }

  for (const child of trace.calls ?? []) {
    items.push(...flattenTrace(child, depth + 1))
  }

  return items
}

function gasColor(gas: number): string {
  if (gas < 50_000) return 'bg-green-500'
  if (gas < 200_000) return 'bg-yellow-500'
  return 'bg-red-500'
}

function gasTextColor(gas: number): string {
  if (gas < 50_000) return 'text-green-400'
  if (gas < 200_000) return 'text-yellow-400'
  return 'text-red-400'
}

export default function GasProfilePanel({
  callTrace,
  totalGas,
}: {
  callTrace: CallTraceEntry | null
  totalGas: number
}) {
  if (!callTrace || totalGas === 0) {
    return (
      <div className="bg-gray-900 rounded-2xl border border-gray-800 p-8">
        <h3 className="text-lg font-bold text-white mb-3">Gas Profile</h3>
        <p className="text-base text-gray-500">Run a simulation to see gas breakdown</p>
      </div>
    )
  }

  const breakdown = flattenTrace(callTrace)
  const maxGas = Math.max(...breakdown.map((b) => b.gas), 1)

  // Estimated cost (assume 30 gwei gas price, ~$2500 ETH)
  const ethCost = (totalGas * 30e9) / 1e18
  const usdCost = ethCost * 2500

  return (
    <div className="bg-gray-900 rounded-2xl border border-gray-800 p-8">
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-lg font-bold text-white">Gas Profile</h3>
        <div className="text-right">
          <p className="text-2xl font-mono font-black text-white">
            {totalGas.toLocaleString()}
          </p>
          <p className="text-base text-gray-500">
            ~{ethCost.toFixed(6)} ETH (${usdCost.toFixed(4)})
          </p>
        </div>
      </div>

      {/* Stacked bar */}
      <div className="flex h-8 rounded-lg overflow-hidden mb-5">
        {breakdown.map((b, i) => {
          const pct = (b.gas / totalGas) * 100
          if (pct < 1) return null
          return (
            <div
              key={i}
              className={`${gasColor(b.gas)} relative group`}
              style={{ width: `${pct}%` }}
              title={`${b.label}: ${b.gas.toLocaleString()} gas (${pct.toFixed(1)}%)`}
            >
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-10">
                <div className="bg-gray-800 text-sm text-white px-3 py-1.5 rounded-lg whitespace-nowrap border border-gray-700">
                  {b.label}: {b.gas.toLocaleString()} gas
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Legend */}
      <div className="flex gap-5 mb-5 text-sm text-gray-500">
        <span className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-green-500" /> {'< 50K'}
        </span>
        <span className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-yellow-500" /> 50K–200K
        </span>
        <span className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-red-500" /> {'> 200K'}
        </span>
      </div>

      {/* Breakdown list */}
      <div className="space-y-2 max-h-72 overflow-y-auto">
        {breakdown.map((b, i) => (
          <div key={i} className="flex items-center gap-3">
            <div
              className="flex-shrink-0"
              style={{ paddingLeft: `${b.depth * 12}px` }}
            >
              <span className="text-sm text-gray-600 font-mono w-16 inline-block">
                {b.type}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3">
                <div className="flex-1 bg-gray-800 rounded-full h-3 overflow-hidden">
                  <div
                    className={`h-full ${gasColor(b.gas)} rounded-full`}
                    style={{ width: `${(b.gas / maxGas) * 100}%` }}
                  />
                </div>
                <span className={`text-sm font-mono w-24 text-right ${gasTextColor(b.gas)}`}>
                  {b.gas.toLocaleString()}
                </span>
              </div>
              <p className="text-sm text-gray-500 truncate">{b.label}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
