'use client'

import { useState, useCallback, useRef, type ReactNode } from 'react'
import ScoreMeter from './ScoreMeter'
import ActionQueue, { type ActionItem } from './ActionQueue'
import { SAFE_SCENARIOS, DEMO_SCENARIOS, DEMO_AGENTS } from '@/lib/demo-scenarios'
import type { VerdictResult } from '@/lib/demo-scenarios'

// ── Agent type ────────────────────────────────────────────────────────

type AgentName = 'TradingBot' | 'MintBot'

const AGENT_OPTIONS: { name: AgentName; id: string; description: string; icon: ReactNode }[] = [
  {
    name: 'TradingBot',
    id: DEMO_AGENTS[0].id,
    description: 'DeFi trading agent',
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
      </svg>
    ),
  },
  {
    name: 'MintBot',
    id: DEMO_AGENTS[1].id,
    description: 'Stablecoin minting agent',
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
]

// ── Helpers ────────────────────────────────────────────────────────────

function buildActions(agentName: AgentName): ActionItem[] {
  const agentId = DEMO_AGENTS.find((a) => a.name === agentName)!.id

  // Safe scenarios: show all 3 (they cover both agents, which is the training baseline)
  const safeActions: ActionItem[] = SAFE_SCENARIOS.map((s) => ({
    title: s.title,
    description: s.subtitle,
    isSafe: true,
    status: 'pending' as const,
  }))

  // Attack scenarios: filter to selected agent
  const attackActions: ActionItem[] = DEMO_SCENARIOS
    .filter((s) => s.proposal.agentId === agentId)
    .map((s) => ({
      title: s.title.includes(': ') ? s.title.split(': ')[1] : s.title,
      description: s.subtitle,
      isSafe: false,
      status: 'pending' as const,
    }))

  return [...safeActions, ...attackActions]
}

function getScenarioByAction(action: ActionItem, agentName: AgentName) {
  const agentId = DEMO_AGENTS.find((a) => a.name === agentName)!.id

  // Check safe scenarios
  const safe = SAFE_SCENARIOS.find((s) => s.title === action.title || s.subtitle === action.description)
  if (safe) return safe

  // Check attack scenarios
  const attack = DEMO_SCENARIOS.find((s) => {
    const attackTitle = s.title.includes(': ') ? s.title.split(': ')[1] : s.title
    return attackTitle === action.title && s.proposal.agentId === agentId
  })
  return attack ?? null
}

// ── Main Component ────────────────────────────────────────────────────

export default function BehavioralTrainingPanel() {
  const [selectedAgent, setSelectedAgent] = useState<AgentName>('TradingBot')
  const [cumulativeScore, setCumulativeScore] = useState(0)
  const [actions, setActions] = useState<ActionItem[]>(() => buildActions('TradingBot'))
  const [isLockout, setIsLockout] = useState(false)
  const [isResetting, setIsResetting] = useState(false)
  const [lockoutShake, setLockoutShake] = useState(false)
  const lockoutTriggeredRef = useRef(false)

  // Switch agent
  const handleAgentChange = useCallback((agent: AgentName) => {
    setSelectedAgent(agent)
    setActions(buildActions(agent))
    setCumulativeScore(0)
    setIsLockout(false)
    lockoutTriggeredRef.current = false
  }, [])

  // Run a single action
  const handleRunAction = useCallback(
    async (index: number) => {
      const action = actions[index]
      if (!action || action.status !== 'pending') return

      const scenario = getScenarioByAction(action, selectedAgent)
      if (!scenario) return

      // Mark as running
      setActions((prev) =>
        prev.map((a, i) =>
          i === index ? { ...a, status: 'running' as const } : a,
        ),
      )

      const scoreBefore = cumulativeScore

      try {
        const res = await fetch('/api/evaluate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ proposal: scenario.proposal }),
        })

        const result: VerdictResult = await res.json()

        // Calculate new cumulative score
        const anomalyDelta = result.anomalyScore ?? 0
        const newScore = Math.min(scoreBefore + anomalyDelta, 100)

        setCumulativeScore(newScore)

        // Mark action as done with score data
        setActions((prev) =>
          prev.map((a, i) =>
            i === index
              ? {
                  ...a,
                  status: 'done' as const,
                  scoreBefore,
                  scoreAfter: newScore,
                  verdict: result.consensus,
                }
              : a,
          ),
        )

        // Check for lockout
        if (newScore >= 70 && !lockoutTriggeredRef.current) {
          lockoutTriggeredRef.current = true
          setIsLockout(true)
          setLockoutShake(true)
          setTimeout(() => setLockoutShake(false), 1000)

          // Fire lockout verdict on-chain
          try {
            await fetch('/api/evaluate', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                proposal: {
                  ...scenario.proposal,
                  description: `LOCKOUT: Cumulative behavioral score ${newScore}/100 exceeded threshold. Agent ${selectedAgent} frozen.`,
                },
              }),
            })
          } catch {
            // Non-blocking lockout verdict
          }
        }
      } catch {
        // API error: mark done with zero delta
        setActions((prev) =>
          prev.map((a, i) =>
            i === index
              ? {
                  ...a,
                  status: 'done' as const,
                  scoreBefore,
                  scoreAfter: scoreBefore,
                  verdict: 'DENIED',
                }
              : a,
          ),
        )
      }
    },
    [actions, cumulativeScore, selectedAgent],
  )

  // Reset training
  const handleReset = useCallback(async () => {
    setIsResetting(true)
    try {
      await fetch('/api/behavioral/reset', { method: 'DELETE' })
    } catch {
      // Non-blocking
    }
    setCumulativeScore(0)
    setActions(buildActions(selectedAgent))
    setIsLockout(false)
    lockoutTriggeredRef.current = false
    setLockoutShake(false)
    setIsResetting(false)
  }, [selectedAgent])

  const currentIndex = actions.findIndex((a) => a.status === 'running')
  const completedCount = actions.filter((a) => a.status === 'done').length
  const attacksBlocked = actions.filter(
    (a) => a.status === 'done' && !a.isSafe && a.verdict === 'DENIED',
  ).length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-black text-white">
            Behavioral Training Ground
          </h2>
          <p className="text-lg text-gray-500 mt-1">
            Train the sentinel by running safe actions, then test with attacks
          </p>
        </div>

        {/* Stats badges */}
        <div className="flex items-center gap-3">
          {completedCount > 0 && (
            <span className="text-base text-gray-400 bg-gray-800 px-3 py-1.5 rounded-lg font-semibold">
              {completedCount}/{actions.length} actions
            </span>
          )}
          {attacksBlocked > 0 && (
            <span className="text-base text-red-400 bg-red-400/10 px-3 py-1.5 rounded-lg font-bold">
              {attacksBlocked} attacks blocked
            </span>
          )}
        </div>
      </div>

      {/* Agent Selector */}
      <div className="flex gap-4">
        {AGENT_OPTIONS.map((agent) => {
          const isSelected = selectedAgent === agent.name
          const isDisabled = actions.some((a) => a.status === 'running')

          return (
            <button
              key={agent.name}
              onClick={() => !isDisabled && handleAgentChange(agent.name)}
              disabled={isDisabled}
              className={`flex-1 flex items-center gap-4 px-6 py-5 rounded-2xl border-2 transition-all duration-300 ${
                isDisabled && !isSelected
                  ? 'opacity-40 cursor-not-allowed'
                  : 'cursor-pointer'
              } ${
                isSelected
                  ? 'border-red-500/60 bg-red-500/10 shadow-lg shadow-red-500/10'
                  : 'border-gray-700/50 bg-gray-900/60 hover:border-gray-600 hover:bg-gray-800/60'
              }`}
            >
              <div
                className={`w-14 h-14 rounded-xl flex items-center justify-center transition-colors ${
                  isSelected
                    ? 'bg-red-500/20 text-red-400'
                    : 'bg-gray-800 text-gray-500'
                }`}
              >
                {agent.icon}
              </div>
              <div className="text-left">
                <span
                  className={`text-xl font-bold block ${
                    isSelected ? 'text-white' : 'text-gray-400'
                  }`}
                >
                  {agent.name}
                </span>
                <span
                  className={`text-base ${
                    isSelected ? 'text-gray-400' : 'text-gray-600'
                  }`}
                >
                  {agent.description}
                </span>
              </div>
              {isSelected && (
                <div className="ml-auto w-3 h-3 rounded-full bg-red-500 animate-pulse" />
              )}
            </button>
          )
        })}
      </div>

      {/* Lockout Banner */}
      {isLockout && (
        <div
          className={`relative overflow-hidden rounded-2xl border-2 border-red-500 bg-red-950/50 px-8 py-6 ${
            lockoutShake ? 'animate-[lockout-shake_0.5s_ease-in-out]' : ''
          }`}
        >
          {/* Animated background pulse */}
          <div className="absolute inset-0 bg-red-500/5 animate-pulse" />

          <div className="relative flex items-center justify-between">
            <div className="flex items-center gap-5">
              {/* Danger icon */}
              <div className="w-16 h-16 rounded-2xl bg-red-500/20 flex items-center justify-center">
                <svg
                  className="w-10 h-10 text-red-400 animate-pulse"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 1.944A11.954 11.954 0 012.166 5C2.056 5.649 2 6.319 2 7c0 5.225 3.34 9.67 8 11.317C14.66 16.67 18 12.225 18 7c0-.682-.057-1.35-.166-2.001A11.954 11.954 0 0110 1.944zM11 14a1 1 0 11-2 0 1 1 0 012 0zm0-7a1 1 0 10-2 0v3a1 1 0 102 0V7z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div>
                <h3 className="text-2xl font-black text-red-400 tracking-wide">
                  AGENT LOCKOUT
                </h3>
                <p className="text-base text-red-300/80 mt-1">
                  Cumulative behavioral score exceeded threshold.{' '}
                  <span className="font-bold text-red-300">{selectedAgent}</span>{' '}
                  has been frozen on-chain via processVerdict.
                </p>
              </div>
            </div>

            <button
              onClick={handleReset}
              disabled={isResetting}
              className="px-6 py-3 bg-gray-800 hover:bg-gray-700 disabled:bg-gray-900 text-white text-base font-bold rounded-xl border border-gray-600 transition-colors shrink-0"
            >
              {isResetting ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Resetting...
                </span>
              ) : (
                'Reset Training'
              )}
            </button>
          </div>
        </div>
      )}

      {/* Score Meter */}
      <ScoreMeter score={cumulativeScore} />

      {/* Action Queue */}
      <ActionQueue
        actions={actions}
        onRunAction={handleRunAction}
        currentIndex={currentIndex}
      />

      {/* Reset button (when not in lockout but actions have been run) */}
      {!isLockout && completedCount > 0 && (
        <div className="flex justify-center">
          <button
            onClick={handleReset}
            disabled={isResetting || actions.some((a) => a.status === 'running')}
            className="px-6 py-3 bg-gray-800 hover:bg-gray-700 disabled:bg-gray-900 disabled:text-gray-600 text-gray-300 text-base font-bold rounded-xl border border-gray-700 transition-colors"
          >
            {isResetting ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                Resetting...
              </span>
            ) : (
              'Reset Training'
            )}
          </button>
        </div>
      )}

      {/* Inline keyframes for lockout shake */}
      <style jsx>{`
        @keyframes lockout-shake {
          0%,
          100% {
            transform: translateX(0);
          }
          10%,
          30%,
          50%,
          70%,
          90% {
            transform: translateX(-4px);
          }
          20%,
          40%,
          60%,
          80% {
            transform: translateX(4px);
          }
        }
      `}</style>
    </div>
  )
}
