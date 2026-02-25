'use client'

import { useState, useCallback, useRef } from 'react'
import ScoreMeter from './ScoreMeter'
import ActionQueue, { type ActionItem } from './ActionQueue'
import {
  ENTERPRISE_PRESETS,
  ENTERPRISE_SCENARIOS,
  SAFE_SCENARIOS,
  DEMO_SCENARIOS,
  DEMO_AGENTS,
  DEFAULT_POLICY,
  getEnterpriseScenariosForAgent,
  buildEnterpriseProposal,
  type EnterprisePreset,
  type EnterpriseAgent,
  type VerdictResult,
  type PolicyOverrides,
} from '@/lib/demo-scenarios'
import PolicyEditor, { isPolicyModified } from './PolicyEditor'

// ── Types ─────────────────────────────────────────────────────────

type PresetId = 'coinbase' | 'aave' | 'lido' | 'custom'

const ETH_PRICE_USD = 2500

// ── Helpers ───────────────────────────────────────────────────────

function formatEthShort(val: number): string {
  if (val >= 1000) return `${(val / 1000).toFixed(0)}K`
  if (val >= 1) return `${Math.round(val)}`
  return `${val.toFixed(1)}`
}

function formatRate(limit: number, windowSec: number): string {
  if (windowSec >= 86400) return `${limit}/${Math.round(windowSec / 86400)}d`
  if (windowSec >= 3600) return `${limit}/${Math.round(windowSec / 3600)}h`
  return `${limit}/${Math.round(windowSec / 60)}m`
}

function buildEnterpriseActions(agent: EnterpriseAgent): ActionItem[] {
  const { safe, attacks } = getEnterpriseScenariosForAgent(agent)

  const safeActions: ActionItem[] = safe.map((s) => ({
    title: s.title,
    description: s.subtitle,
    isSafe: true,
    status: 'pending' as const,
  }))

  const attackActions: ActionItem[] = attacks.map((s) => ({
    title: s.title,
    description: s.subtitle,
    isSafe: false,
    status: 'pending' as const,
  }))

  return [...safeActions, ...attackActions]
}

function buildCustomActions(agentName: 'TradingBot' | 'MintBot'): ActionItem[] {
  const agentId = DEMO_AGENTS.find((a) => a.name === agentName)!.id
  const safeActions: ActionItem[] = SAFE_SCENARIOS.map((s) => ({
    title: s.title,
    description: s.subtitle,
    isSafe: true,
    status: 'pending' as const,
  }))
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

function getScenarioProposal(action: ActionItem, preset: EnterprisePreset | null, agent: EnterpriseAgent | null, customAgent?: 'TradingBot' | 'MintBot') {
  if (preset && agent) {
    // Enterprise mode
    const { safe, attacks } = getEnterpriseScenariosForAgent(agent)
    const all = [...safe, ...attacks]
    const scenario = all.find((s) => s.title === action.title)
    if (scenario) return buildEnterpriseProposal(scenario, agent)
  }

  // Custom mode — search existing scenarios
  if (customAgent) {
    const agentId = DEMO_AGENTS.find((a) => a.name === customAgent)!.id
    const safe = SAFE_SCENARIOS.find((s) => s.title === action.title || s.subtitle === action.description)
    if (safe) return safe.proposal
    const attack = DEMO_SCENARIOS.find((s) => {
      const attackTitle = s.title.includes(': ') ? s.title.split(': ')[1] : s.title
      return attackTitle === action.title && s.proposal.agentId === agentId
    })
    if (attack) return attack.proposal
  }
  return null
}

// ── Main Component ────────────────────────────────────────────────

export default function BehavioralTrainingPanel() {
  const [selectedPreset, setSelectedPreset] = useState<PresetId>('coinbase')
  const [selectedAgentIndex, setSelectedAgentIndex] = useState(0)
  const [customAgent, setCustomAgent] = useState<'TradingBot' | 'MintBot'>('TradingBot')
  const [cumulativeScore, setCumulativeScore] = useState(0)
  const [actions, setActions] = useState<ActionItem[]>(() =>
    buildEnterpriseActions(ENTERPRISE_PRESETS[0].agents[0])
  )
  const [isLockout, setIsLockout] = useState(false)
  const [isResetting, setIsResetting] = useState(false)
  const [lockoutShake, setLockoutShake] = useState(false)
  const lockoutTriggeredRef = useRef(false)
  const [policyOverrides, setPolicyOverrides] = useState<PolicyOverrides>(
    ENTERPRISE_PRESETS[0].agents[0].policy
  )

  // Derived state
  const isEnterprise = selectedPreset !== 'custom'
  const preset = ENTERPRISE_PRESETS.find((p) => p.id === selectedPreset) ?? null
  const agents = preset?.agents ?? []
  const selectedAgent = isEnterprise ? agents[selectedAgentIndex] ?? null : null
  const agentDisplayName = isEnterprise
    ? selectedAgent?.name ?? ''
    : customAgent

  // Switch preset
  const handlePresetChange = useCallback((presetId: PresetId) => {
    setSelectedPreset(presetId)
    setSelectedAgentIndex(0)
    setCumulativeScore(0)
    setIsLockout(false)
    lockoutTriggeredRef.current = false

    if (presetId === 'custom') {
      setPolicyOverrides(DEFAULT_POLICY)
      setActions(buildCustomActions('TradingBot'))
      setCustomAgent('TradingBot')
    } else {
      const p = ENTERPRISE_PRESETS.find((pr) => pr.id === presetId)!
      const agent = p.agents[0]
      setPolicyOverrides(agent.policy)
      setActions(buildEnterpriseActions(agent))
    }
  }, [])

  // Switch agent within preset
  const handleAgentChange = useCallback(
    (agentIdx: number) => {
      if (!isEnterprise || !preset) return
      const agent = preset.agents[agentIdx]
      if (!agent) return
      setSelectedAgentIndex(agentIdx)
      setPolicyOverrides(agent.policy)
      setActions(buildEnterpriseActions(agent))
      setCumulativeScore(0)
      setIsLockout(false)
      lockoutTriggeredRef.current = false
    },
    [isEnterprise, preset],
  )

  // Switch custom agent
  const handleCustomAgentChange = useCallback((name: 'TradingBot' | 'MintBot') => {
    setCustomAgent(name)
    setPolicyOverrides(DEFAULT_POLICY)
    setActions(buildCustomActions(name))
    setCumulativeScore(0)
    setIsLockout(false)
    lockoutTriggeredRef.current = false
  }, [])

  // Run a single action
  const handleRunAction = useCallback(
    async (index: number) => {
      const action = actions[index]
      if (!action || action.status !== 'pending') return

      const proposal = getScenarioProposal(action, preset, selectedAgent, isEnterprise ? undefined : customAgent)
      if (!proposal) return

      setActions((prev) =>
        prev.map((a, i) => (i === index ? { ...a, status: 'running' as const } : a)),
      )

      const scoreBefore = cumulativeScore

      try {
        const baselinePolicy = isEnterprise && selectedAgent ? selectedAgent.policy : DEFAULT_POLICY
        const isModified = isPolicyModified(policyOverrides, baselinePolicy)

        const res = await fetch('/api/evaluate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            proposal,
            policyOverrides: isModified ? policyOverrides : policyOverrides,
          }),
        })

        const result: VerdictResult = await res.json()
        const anomalyDelta = result.anomalyScore ?? 0
        const newScore = Math.min(scoreBefore + anomalyDelta, 100)
        setCumulativeScore(newScore)

        setActions((prev) =>
          prev.map((a, i) =>
            i === index
              ? {
                  ...a,
                  status: 'done' as const,
                  scoreBefore,
                  scoreAfter: newScore,
                  verdict: result.consensus,
                  layerCatchInfo: result.layerCatchInfo,
                }
              : a,
          ),
        )

        if (newScore >= 70 && !lockoutTriggeredRef.current) {
          lockoutTriggeredRef.current = true
          setIsLockout(true)
          setLockoutShake(true)
          setTimeout(() => setLockoutShake(false), 1000)

          try {
            await fetch('/api/evaluate', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                proposal: {
                  ...proposal,
                  description: `LOCKOUT: Cumulative behavioral score ${newScore}/100 exceeded threshold. Agent ${agentDisplayName} frozen.`,
                },
              }),
            })
          } catch {
            // Non-blocking lockout verdict
          }
        }
      } catch {
        setActions((prev) =>
          prev.map((a, i) =>
            i === index
              ? { ...a, status: 'done' as const, scoreBefore, scoreAfter: scoreBefore, verdict: 'DENIED' }
              : a,
          ),
        )
      }
    },
    [actions, cumulativeScore, policyOverrides, preset, selectedAgent, isEnterprise, customAgent, agentDisplayName],
  )

  // Reset
  const handleReset = useCallback(async () => {
    setIsResetting(true)
    try {
      await fetch('/api/behavioral/reset', { method: 'DELETE' })
    } catch {
      // Non-blocking
    }
    setCumulativeScore(0)
    setIsLockout(false)
    lockoutTriggeredRef.current = false
    setLockoutShake(false)

    if (isEnterprise && selectedAgent) {
      setPolicyOverrides(selectedAgent.policy)
      setActions(buildEnterpriseActions(selectedAgent))
    } else {
      setPolicyOverrides(DEFAULT_POLICY)
      setActions(buildCustomActions(customAgent))
    }
    setIsResetting(false)
  }, [isEnterprise, selectedAgent, customAgent])

  const currentIndex = actions.findIndex((a) => a.status === 'running')
  const completedCount = actions.filter((a) => a.status === 'done').length
  const allDone = actions.every((a) => a.status === 'done') && actions.length > 0
  const isRunning = actions.some((a) => a.status === 'running')
  const attacksBlocked = actions.filter(
    (a) => a.status === 'done' && !a.isSafe && a.verdict === 'DENIED',
  ).length
  const totalAttacks = actions.filter((a) => !a.isSafe).length
  const safeApproved = actions.filter(
    (a) => a.status === 'done' && a.isSafe && a.verdict === 'APPROVED',
  ).length
  const totalSafe = actions.filter((a) => a.isSafe).length

  // Calculate protected value (ETH from blocked attacks * ETH price)
  const protectedValueUsd = actions
    .filter((a) => a.status === 'done' && !a.isSafe && a.verdict === 'DENIED')
    .reduce((sum, a) => {
      const scenario = isEnterprise && selectedAgent
        ? [...getEnterpriseScenariosForAgent(selectedAgent).attacks].find(s => s.title === a.title)
        : null
      if (scenario) {
        const ethValue = Number(BigInt(scenario.proposal.value || '0')) / 1e18
        const mintValue = Number(BigInt(scenario.proposal.mintAmount || '0')) / 1e18
        return sum + (ethValue + mintValue / 1000) * ETH_PRICE_USD
      }
      return sum
    }, 0)

  function formatUsd(val: number): string {
    if (val >= 1_000_000_000) return `$${(val / 1_000_000_000).toFixed(1)}B`
    if (val >= 1_000_000) return `$${(val / 1_000_000).toFixed(1)}M`
    if (val >= 1_000) return `$${(val / 1_000).toFixed(0)}K`
    return `$${val.toFixed(0)}`
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-4xl font-black text-white">
            Enterprise Security Console
          </h2>
          <p className="text-xl text-gray-300 mt-1">
            Configure per-agent policies and test against role-specific threats
          </p>
        </div>

        <div className="flex items-center gap-3">
          {completedCount > 0 && (
            <span className="text-lg text-gray-400 bg-gray-800 px-3 py-1.5 rounded-lg font-semibold">
              {completedCount}/{actions.length} actions
            </span>
          )}
          {attacksBlocked > 0 && (
            <span className="text-lg text-red-400 bg-red-400/10 px-3 py-1.5 rounded-lg font-bold">
              {attacksBlocked} blocked
            </span>
          )}
        </div>
      </div>

      {/* Enterprise Preset Selector */}
      <div className="grid grid-cols-4 gap-3">
        {[...ENTERPRISE_PRESETS, { id: 'custom', name: 'Custom', description: 'TradingBot + MintBot (original)', icon: '\u{1F527}', agents: [] }].map((p) => {
          const isSelected = selectedPreset === p.id
          return (
            <button
              key={p.id}
              onClick={() => !isRunning && handlePresetChange(p.id as PresetId)}
              disabled={isRunning}
              className={`p-4 rounded-2xl border-2 text-left transition-all ${
                isRunning && !isSelected
                  ? 'opacity-40 cursor-not-allowed'
                  : 'cursor-pointer'
              } ${
                isSelected
                  ? 'border-red-500/60 bg-red-500/10 shadow-lg shadow-red-500/10'
                  : 'border-gray-700/50 bg-gray-900/60 hover:border-gray-600 hover:bg-gray-800/60'
              }`}
            >
              <div className="text-2xl mb-1">{p.icon}</div>
              <div className={`text-xl font-bold ${isSelected ? 'text-white' : 'text-gray-300'}`}>
                {p.name}
              </div>
              <div className={`text-base mt-0.5 ${isSelected ? 'text-gray-400' : 'text-gray-500'}`}>
                {p.agents.length > 0 ? `${p.agents.length} agents` : 'Manual config'}
              </div>
            </button>
          )
        })}
      </div>

      {/* Agent Fleet Grid (enterprise mode) */}
      {isEnterprise && preset && (
        <div className="bg-gray-900 rounded-2xl border border-gray-800 p-5">
          <h3 className="text-lg font-bold uppercase tracking-wider text-gray-300 mb-4">
            Agent Fleet — {preset.name}
          </h3>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
            {agents.map((agent, idx) => {
              const isSelected = selectedAgentIndex === idx
              return (
                <button
                  key={agent.id}
                  onClick={() => !isRunning && handleAgentChange(idx)}
                  disabled={isRunning}
                  className={`p-4 rounded-xl border-2 text-left transition-all ${
                    isRunning && !isSelected
                      ? 'opacity-40 cursor-not-allowed'
                      : 'cursor-pointer'
                  } ${
                    isSelected
                      ? 'border-red-500/60 bg-red-500/10'
                      : 'border-gray-700/50 bg-gray-800/30 hover:border-gray-600'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-lg">{agent.icon}</span>
                    <span className={`w-2 h-2 rounded-full ${
                      isSelected ? 'bg-green-500 animate-pulse' : 'bg-green-500/40'
                    }`} />
                  </div>
                  <div className={`text-lg font-bold ${isSelected ? 'text-white' : 'text-gray-300'}`}>
                    {agent.name}
                  </div>
                  <div className="text-base text-gray-400 mt-0.5">{agent.description}</div>
                  <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-2 text-base text-gray-400 font-mono">
                    <span>{formatEthShort(agent.policy.maxValueEth)}/tx</span>
                    {agent.policy.dailyVolumeEnabled && (
                      <span>{formatEthShort(agent.policy.dailyVolumeEth)}/d</span>
                    )}
                    {agent.policy.rateLimitEnabled && (
                      <span>{formatRate(agent.policy.rateLimit, agent.policy.rateLimitWindow)}</span>
                    )}
                    {agent.policy.porEnabled && (
                      <span className="text-blue-400">PoR</span>
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Custom Agent Selector */}
      {!isEnterprise && (
        <div className="flex gap-4">
          {(['TradingBot', 'MintBot'] as const).map((name) => {
            const isSelected = customAgent === name
            return (
              <button
                key={name}
                onClick={() => !isRunning && handleCustomAgentChange(name)}
                disabled={isRunning}
                className={`flex-1 px-6 py-5 rounded-2xl border-2 transition-all text-left ${
                  isRunning && !isSelected
                    ? 'opacity-40 cursor-not-allowed'
                    : 'cursor-pointer'
                } ${
                  isSelected
                    ? 'border-red-500/60 bg-red-500/10 shadow-lg shadow-red-500/10'
                    : 'border-gray-700/50 bg-gray-900/60 hover:border-gray-600 hover:bg-gray-800/60'
                }`}
              >
                <span className={`text-xl font-bold block ${isSelected ? 'text-white' : 'text-gray-400'}`}>
                  {name}
                </span>
                <span className={`text-base ${isSelected ? 'text-gray-400' : 'text-gray-600'}`}>
                  {name === 'TradingBot' ? 'DeFi trading agent' : 'Stablecoin minting agent'}
                </span>
              </button>
            )
          })}
        </div>
      )}

      {/* Policy Configuration */}
      <PolicyEditor
        overrides={policyOverrides}
        onChange={setPolicyOverrides}
        disabled={isRunning}
        agentName={agentDisplayName}
        baselinePolicy={isEnterprise && selectedAgent ? selectedAgent.policy : DEFAULT_POLICY}
      />

      {/* Lockout Banner */}
      {isLockout && (
        <div
          className={`relative overflow-hidden rounded-2xl border-2 border-red-500 bg-red-950/50 px-8 py-6 ${
            lockoutShake ? 'animate-lockout-shake' : ''
          }`}
        >
          <div className="absolute inset-0 bg-red-500/5 animate-pulse" />
          <div className="relative flex items-center justify-between">
            <div className="flex items-center gap-5">
              <div className="w-16 h-16 rounded-2xl bg-red-500/20 flex items-center justify-center">
                <svg className="w-10 h-10 text-red-400 animate-pulse" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 1.944A11.954 11.954 0 012.166 5C2.056 5.649 2 6.319 2 7c0 5.225 3.34 9.67 8 11.317C14.66 16.67 18 12.225 18 7c0-.682-.057-1.35-.166-2.001A11.954 11.954 0 0110 1.944zM11 14a1 1 0 11-2 0 1 1 0 012 0zm0-7a1 1 0 10-2 0v3a1 1 0 102 0V7z" clipRule="evenodd" />
                </svg>
              </div>
              <div>
                <h3 className="text-2xl font-black text-red-400 tracking-wide">AGENT LOCKOUT</h3>
                <p className="text-base text-red-300/80 mt-1">
                  Cumulative behavioral score exceeded threshold.{' '}
                  <span className="font-bold text-red-300">{agentDisplayName}</span>{' '}
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

      {/* Summary Stats Bar */}
      {allDone && (
        <div className="bg-gray-900 rounded-2xl border border-gray-800 p-6">
          <h3 className="text-2xl font-bold text-white mb-4">
            Security Assessment{isEnterprise && selectedAgent ? ` — ${preset?.name} ${selectedAgent.name}` : ''}
          </h3>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className={`text-4xl font-black ${attacksBlocked === totalAttacks ? 'text-green-400' : 'text-red-400'}`}>
                {attacksBlocked}/{totalAttacks}
              </div>
              <div className="text-base text-gray-400 mt-1">Attacks Blocked</div>
            </div>
            <div>
              <div className={`text-4xl font-black ${safeApproved === totalSafe ? 'text-green-400' : 'text-yellow-400'}`}>
                {safeApproved}/{totalSafe}
              </div>
              <div className="text-base text-gray-400 mt-1">Safe Ops Approved</div>
            </div>
            <div>
              <div className="text-4xl font-black text-white">
                {protectedValueUsd > 0 ? formatUsd(protectedValueUsd) : 'N/A'}
              </div>
              <div className="text-base text-gray-400 mt-1">Value Protected</div>
            </div>
          </div>
        </div>
      )}

      {/* Reset button */}
      {!isLockout && completedCount > 0 && (
        <div className="flex justify-center">
          <button
            onClick={handleReset}
            disabled={isResetting || isRunning}
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
    </div>
  )
}
