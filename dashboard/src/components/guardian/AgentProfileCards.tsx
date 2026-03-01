'use client'

import {
  AGENT_PROFILES,
  getAgentSessionStats,
  type AgentProfile,
} from '@/lib/guardian-data'
import type { VerdictEntry } from '@/hooks/useVerdictHistory'
import { DEMO_SCENARIOS } from '@/lib/demo-scenarios'

// ── Severity color mapping for scenario badges ───────────────────────

const SEVERITY_COLORS: Record<string, { text: string; bg: string; border: string }> = {
  CRITICAL: {
    text: 'text-red-400',
    bg: 'bg-red-400/10',
    border: 'border-red-400/30',
  },
  MEDIUM: {
    text: 'text-orange-400',
    bg: 'bg-orange-400/10',
    border: 'border-orange-400/30',
  },
  LOW: {
    text: 'text-yellow-400',
    bg: 'bg-yellow-400/10',
    border: 'border-yellow-400/30',
  },
}

// ── Left border color mapping (Tailwind can't interpolate dynamic classes) ──

const LEFT_BORDER_MAP: Record<string, string> = {
  'text-blue-400': 'border-l-blue-400',
  'text-purple-400': 'border-l-purple-400',
  'text-green-400': 'border-l-green-400',
  'text-orange-400': 'border-l-orange-400',
  'text-red-400': 'border-l-red-400',
  'text-cyan-400': 'border-l-cyan-400',
}

// ── Bar color helper for sparkline ───────────────────────────────────

function getBarColor(score: number): string {
  if (score < 25) return 'bg-green-400'
  if (score < 50) return 'bg-orange-400'
  return 'bg-red-400'
}

// ── Sparkline sub-component ─────────────────────────────────────────

function BehavioralSparkline({ verdicts }: { verdicts: VerdictEntry[] }) {
  if (verdicts.length === 0) {
    return (
      <div className="flex items-center justify-center h-24 text-base text-gray-600">
        Run demo scenarios to see behavioral trend
      </div>
    )
  }

  // Reverse so oldest is on the left (verdicts array is newest-first)
  const chronological = [...verdicts].reverse()

  return (
    <div>
      <div className="flex items-end gap-[2px] h-16 overflow-x-auto">
        {chronological.map((v, i) => {
          const score = v.anomalyScore ?? 0
          const heightPx = Math.max(2, Math.round((score / 100) * 64))
          return (
            <div
              key={v.id ?? i}
              className={`${getBarColor(score)} rounded-t-sm shrink-0 transition-all`}
              style={{ width: 12, height: heightPx }}
              title={`Score: ${score}`}
            />
          )
        })}
      </div>
      <div className="flex justify-between mt-1">
        <span className="text-base text-green-400/60">Trusted</span>
        <span className="text-base text-red-400/60">Compromised</span>
      </div>
    </div>
  )
}

// ── Scenario badge sub-component ────────────────────────────────────

function ScenarioBadge({ scenarioId }: { scenarioId: number }) {
  const scenario = DEMO_SCENARIOS.find((s) => s.id === scenarioId)
  if (!scenario) return null

  // Extract short title: everything after "Scenario N: "
  const shortTitle = scenario.title.replace(/^Scenario \d+:\s*/, '')
  const colors = SEVERITY_COLORS[scenario.severity] ?? SEVERITY_COLORS.LOW

  return (
    <span
      className={`inline-flex text-base px-2 py-0.5 rounded-full border font-medium ${colors.text} ${colors.bg} ${colors.border}`}
    >
      {shortTitle}
    </span>
  )
}

// ── Single agent card ───────────────────────────────────────────────

function AgentCard({
  profile,
  sessionVerdicts,
}: {
  profile: AgentProfile
  sessionVerdicts: VerdictEntry[]
}) {
  const stats = getAgentSessionStats(profile.id, sessionVerdicts)
  const leftBorder = LEFT_BORDER_MAP[profile.colorScheme.primary] ?? 'border-l-gray-400'

  // Parse threat count for coloring
  const threatMatch = profile.threatProfile.match(/^(\d+)/)
  const threatCount = threatMatch ? parseInt(threatMatch[1], 10) : 0
  const threatColors =
    threatCount >= 5
      ? 'text-red-400 bg-red-400/10 border-red-400/30'
      : 'text-orange-400 bg-orange-400/10 border-orange-400/30'

  return (
    <div
      className={`bg-gray-900 rounded-2xl border border-gray-800 p-6 border-l-4 ${leftBorder}`}
    >
      {/* 1. Header */}
      <div className="mb-4">
        <h3 className="text-3xl font-black text-white">{profile.name}</h3>
        <p className={`text-lg font-semibold ${profile.colorScheme.primary}`}>
          {profile.role}
        </p>
      </div>

      {/* 2. Description */}
      <p className="text-base text-gray-400 leading-relaxed mb-4">
        {profile.description}
      </p>

      {/* 3. Threat Profile */}
      <div className="mb-4">
        <span
          className={`inline-flex text-base font-bold px-3 py-1 rounded-full border ${threatColors}`}
        >
          {profile.threatProfile}
        </span>
      </div>

      {/* 4. Policy Grid (3x2) */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        {profile.policyHighlights.map((item) => (
          <div
            key={item.label}
            className={`rounded-lg px-3 py-2 ${
              item.emphasis
                ? `${profile.colorScheme.bg} border ${profile.colorScheme.border}`
                : 'bg-gray-800/50'
            }`}
          >
            <p className="text-base text-gray-500 mb-0.5">{item.label}</p>
            <p
              className={`text-base ${
                item.emphasis
                  ? `${profile.colorScheme.primary} font-bold`
                  : 'text-gray-300'
              }`}
            >
              {item.value}
            </p>
          </div>
        ))}
      </div>

      {/* 5. Session Stats Row */}
      <div className="flex flex-wrap gap-3 mb-4">
        <span className="inline-flex items-center gap-1.5 text-base font-semibold px-3 py-1 rounded-full bg-green-400/10 text-green-400 border border-green-400/30">
          {stats.approved} approved
        </span>
        <span className="inline-flex items-center gap-1.5 text-base font-semibold px-3 py-1 rounded-full bg-red-400/10 text-red-400 border border-red-400/30">
          {stats.denied} denied
        </span>
        <span className="inline-flex items-center gap-1.5 text-base font-semibold px-3 py-1 rounded-full bg-gray-800 text-gray-300 border border-gray-700">
          Avg anomaly: {stats.avgAnomalyScore}
        </span>
        <span className="inline-flex items-center gap-1.5 text-base font-semibold px-3 py-1 rounded-full bg-orange-400/10 text-orange-400 border border-orange-400/30">
          {stats.anomalyFlaggedCount} flagged
        </span>
      </div>

      {/* 6. Behavioral Score Trend Sparkline */}
      <div className="mb-4">
        <p className="text-base text-gray-500 font-semibold uppercase tracking-wider mb-2">
          Behavioral Score Trend
        </p>
        <div className="bg-gray-800/40 rounded-lg p-3 border border-gray-700/50">
          <BehavioralSparkline verdicts={stats.verdicts} />
        </div>
      </div>

      {/* 7. Scenario Badges */}
      {profile.targetedScenarios.length > 0 && (
        <div>
          <p className="text-base text-gray-500 font-semibold uppercase tracking-wider mb-2">
            Targeted Scenarios
          </p>
          <div className="flex flex-wrap gap-1.5">
            {profile.targetedScenarios.map((sid) => (
              <ScenarioBadge key={sid} scenarioId={sid} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Main exported component ─────────────────────────────────────────

export default function AgentProfileCards({
  sessionVerdicts,
}: {
  sessionVerdicts: VerdictEntry[]
}) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {AGENT_PROFILES.map((profile) => (
        <AgentCard
          key={profile.id}
          profile={profile}
          sessionVerdicts={sessionVerdicts}
        />
      ))}
    </div>
  )
}
