'use client'

import { getDefenseLayerCounts } from '@/lib/guardian-data'
import type { VerdictEntry } from '@/hooks/useVerdictHistory'

interface DefenseAnalyticsChartsProps {
  sessionVerdicts: VerdictEntry[]
}

// ── Chart 1: Verdict Distribution (SVG Donut) ────────────────────────

function VerdictDistribution({ verdicts }: { verdicts: VerdictEntry[] }) {
  const approved = verdicts.filter((v) => v.consensus === 'APPROVED').length
  const denied = verdicts.filter((v) => v.consensus === 'DENIED').length
  const total = approved + denied

  const circumference = 2 * Math.PI * 36
  const approvedPct = total > 0 ? approved / total : 0
  const deniedPct = total > 0 ? denied / total : 0
  const approvedDash = approvedPct * circumference
  const deniedDash = deniedPct * circumference
  const deniedOffset = approvedDash

  return (
    <div className="bg-gray-800/50 rounded-xl p-5 border border-gray-700/50">
      <h3 className="text-base font-semibold text-gray-400 uppercase tracking-wider mb-4">
        Verdict Distribution
      </h3>
      <div className="flex flex-col items-center gap-3">
        <svg viewBox="0 0 100 100" className="w-32 h-32">
          {/* Background ring */}
          <circle
            cx="50"
            cy="50"
            r="36"
            fill="none"
            stroke="currentColor"
            className="text-gray-700"
            strokeWidth="10"
          />
          {/* Approved arc (green) */}
          {total > 0 && approvedDash > 0 && (
            <circle
              cx="50"
              cy="50"
              r="36"
              fill="none"
              stroke="#4ade80"
              strokeWidth="10"
              strokeDasharray={`${approvedDash} ${circumference - approvedDash}`}
              strokeDashoffset="0"
              transform="rotate(-90 50 50)"
              strokeLinecap="round"
            />
          )}
          {/* Denied arc (red) */}
          {total > 0 && deniedDash > 0 && (
            <circle
              cx="50"
              cy="50"
              r="36"
              fill="none"
              stroke="#f87171"
              strokeWidth="10"
              strokeDasharray={`${deniedDash} ${circumference - deniedDash}`}
              strokeDashoffset={`${-deniedOffset}`}
              transform="rotate(-90 50 50)"
              strokeLinecap="round"
            />
          )}
          {/* Center count */}
          <text
            x="50"
            y="50"
            textAnchor="middle"
            dominantBaseline="central"
            fill="white"
            fontWeight="bold"
            fontSize="16"
          >
            {total}
          </text>
        </svg>
        <div className="flex items-center gap-4 text-base text-gray-300">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-green-400" />
            Approved ({approved})
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-red-400" />
            Denied ({denied})
          </span>
        </div>
      </div>
    </div>
  )
}

// ── Chart 2: Severity Breakdown (Horizontal Bars) ─────────────────────

function SeverityBreakdown({ verdicts }: { verdicts: VerdictEntry[] }) {
  const denied = verdicts.filter((v) => v.consensus === 'DENIED')
  const critical = denied.filter((v) => v.severity === 'CRITICAL').length
  const medium = denied.filter((v) => v.severity === 'MEDIUM').length
  const low = denied.filter((v) => v.severity === 'LOW').length
  const maxCount = Math.max(critical, medium, low, 1)

  const rows: { label: string; count: number; color: string }[] = [
    { label: 'CRITICAL', count: critical, color: 'bg-red-400' },
    { label: 'MEDIUM', count: medium, color: 'bg-orange-400' },
    { label: 'LOW', count: low, color: 'bg-yellow-400' },
  ]

  return (
    <div className="bg-gray-800/50 rounded-xl p-5 border border-gray-700/50">
      <h3 className="text-base font-semibold text-gray-400 uppercase tracking-wider mb-4">
        Severity Breakdown
      </h3>
      <div className="space-y-3">
        {rows.map((row) => (
          <div key={row.label} className="flex items-center gap-3">
            <span className="text-base text-gray-400 w-16 shrink-0 font-mono">
              {row.label}
            </span>
            <div className="flex-1 bg-gray-700/50 rounded-full h-5 overflow-hidden">
              <div
                className={`${row.color} h-5 rounded-full transition-all duration-500`}
                style={{
                  width:
                    row.count > 0
                      ? `${Math.max((row.count / maxCount) * 100, 4)}%`
                      : '0%',
                  minWidth: row.count > 0 ? '4px' : '0px',
                }}
              />
            </div>
            <span className="text-base text-gray-300 w-6 text-right font-mono">
              {row.count}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Chart 3: Behavioral Risk Histogram (Vertical Bars) ────────────────

function BehavioralRiskHistogram({ verdicts }: { verdicts: VerdictEntry[] }) {
  const bins = [
    { range: '0', min: 0, max: 19, color: 'bg-green-400' },
    { range: '20', min: 20, max: 39, color: 'bg-lime-400' },
    { range: '40', min: 40, max: 59, color: 'bg-yellow-400' },
    { range: '60', min: 60, max: 79, color: 'bg-orange-400' },
    { range: '80', min: 80, max: 100, color: 'bg-red-400' },
  ]

  const binCounts = bins.map((bin) => ({
    ...bin,
    count: verdicts.filter((v) => {
      const score = v.anomalyScore ?? 0
      return score >= bin.min && score <= bin.max
    }).length,
  }))

  const maxBinCount = Math.max(...binCounts.map((b) => b.count), 1)

  return (
    <div className="bg-gray-800/50 rounded-xl p-5 border border-gray-700/50">
      <h3 className="text-base font-semibold text-gray-400 uppercase tracking-wider mb-4">
        Behavioral Risk Histogram
      </h3>
      <div className="flex items-end justify-center gap-2 h-28">
        {binCounts.map((bin) => (
          <div key={bin.range} className="flex flex-col items-center gap-1">
            <div className="flex items-end h-20">
              <div
                className={`w-10 ${bin.color} rounded-t transition-all duration-500`}
                style={{
                  height:
                    bin.count > 0
                      ? `${(bin.count / maxBinCount) * 100}%`
                      : '2px',
                  opacity: bin.count > 0 ? 1 : 0.3,
                }}
              />
            </div>
            <span className="text-xs text-gray-500 font-mono">
              {bin.range}
            </span>
          </div>
        ))}
      </div>
      <div className="text-center mt-1">
        <span className="text-xs text-gray-600">Anomaly Score Range</span>
      </div>
    </div>
  )
}

// ── Chart 4: Defense Layer Effectiveness (Stacked Bar) ────────────────

function DefenseLayerEffectiveness({
  verdicts,
}: {
  verdicts: VerdictEntry[]
}) {
  const { behavioral, aiConsensus, onChain, total } =
    getDefenseLayerCounts(verdicts)

  const pct = (n: number) => (total > 0 ? Math.round((n / total) * 100) : 0)

  const layers = [
    {
      label: 'On-Chain Policy',
      count: onChain,
      pct: pct(onChain),
      color: 'bg-red-400',
      textColor: 'text-red-400',
      dot: 'bg-red-400',
    },
    {
      label: 'Behavioral Engine',
      count: behavioral,
      pct: pct(behavioral),
      color: 'bg-orange-400',
      textColor: 'text-orange-400',
      dot: 'bg-orange-400',
    },
    {
      label: 'AI Consensus',
      count: aiConsensus,
      pct: pct(aiConsensus),
      color: 'bg-purple-400',
      textColor: 'text-purple-400',
      dot: 'bg-purple-400',
    },
  ]

  return (
    <div className="bg-gray-800/50 rounded-xl p-5 border border-gray-700/50">
      <h3 className="text-base font-semibold text-gray-400 uppercase tracking-wider mb-4">
        Defense Layer Effectiveness
      </h3>
      {/* Stacked horizontal bar */}
      <div className="h-8 rounded-full overflow-hidden flex bg-gray-700/50">
        {total > 0 ? (
          layers.map(
            (layer) =>
              layer.count > 0 && (
                <div
                  key={layer.label}
                  className={`${layer.color} transition-all duration-500`}
                  style={{ width: `${(layer.count / total) * 100}%` }}
                />
              ),
          )
        ) : (
          <div className="w-full bg-gray-700/50" />
        )}
      </div>
      {/* Breakdown rows */}
      <div className="mt-4 space-y-2">
        {layers.map((layer) => (
          <div
            key={layer.label}
            className="flex items-center justify-between text-base"
          >
            <span className="flex items-center gap-2">
              <span className={`w-2.5 h-2.5 rounded-full ${layer.dot}`} />
              <span className="text-gray-300">{layer.label}</span>
            </span>
            <span className="text-gray-400 font-mono">
              {layer.count}{' '}
              <span className="text-gray-600">({layer.pct}%)</span>
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Main Component ────────────────────────────────────────────────────

export default function DefenseAnalyticsCharts({
  sessionVerdicts,
}: DefenseAnalyticsChartsProps) {
  return (
    <div className="bg-gray-900 rounded-2xl border border-gray-800 p-6">
      <h2 className="text-lg font-bold text-gray-300 uppercase tracking-widest mb-6">
        Defense Analytics
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <VerdictDistribution verdicts={sessionVerdicts} />
        <SeverityBreakdown verdicts={sessionVerdicts} />
        <BehavioralRiskHistogram verdicts={sessionVerdicts} />
        <DefenseLayerEffectiveness verdicts={sessionVerdicts} />
      </div>
    </div>
  )
}
