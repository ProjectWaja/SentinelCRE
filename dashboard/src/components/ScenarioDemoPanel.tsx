'use client'

import { useState, useCallback, useRef } from 'react'
import { DEMO_SCENARIOS, SAFE_SCENARIOS, INCIDENT_SCENARIOS, type DemoScenario, type VerdictResult } from '@/lib/demo-scenarios'
import { evaluateAction } from '@/lib/mock-api'

type RunState = 'idle' | 'running' | 'done' | 'waiting'

const SEVERITY_BADGE = {
  LOW: { bg: 'bg-yellow-400/10', text: 'text-yellow-400', border: 'border-yellow-400/30' },
  MEDIUM: { bg: 'bg-orange-400/10', text: 'text-orange-400', border: 'border-orange-400/30' },
  CRITICAL: { bg: 'bg-red-400/10', text: 'text-red-400', border: 'border-red-400/30' },
}

export default function ScenarioDemoPanel({
  onVerdictReceived,
  onPipelineStart,
  onPipelineComplete,
  onPipelineStep,
}: {
  onVerdictReceived: (v: VerdictResult) => void
  onPipelineStart?: (description: string) => void
  onPipelineComplete?: (result: VerdictResult) => void
  onPipelineStep?: (stepIndex: number, totalSteps: number) => void
}) {
  const [activeScenario, setActiveScenario] = useState<DemoScenario | null>(null)
  const [runState, setRunState] = useState<RunState>('idle')
  const [activeStep, setActiveStep] = useState(-1)
  const [verdict, setVerdict] = useState<VerdictResult | null>(null)
  const [runningPhase, setRunningPhase] = useState<number | null>(null)
  const [completedIds, setCompletedIds] = useState<Set<number>>(new Set())
  const [nextScenarioName, setNextScenarioName] = useState<string | null>(null)
  const cancelRef = useRef(false)
  const AUTO_ADVANCE_DELAY = 3000

  const additionalScenarios = DEMO_SCENARIOS

  const runScenario = useCallback(async (scenario: DemoScenario) => {
    setActiveScenario(scenario)
    setRunState('running')
    setVerdict(null)
    setActiveStep(0)
    onPipelineStart?.(scenario.title)

    for (let i = 0; i < scenario.steps.length; i++) {
      setActiveStep(i)
      onPipelineStep?.(i, scenario.steps.length)
      await new Promise((r) => setTimeout(r, 800))
    }

    await new Promise((r) => setTimeout(r, 600))

    try {
      const result = await evaluateAction(scenario.proposal)
      setVerdict(result)
      onVerdictReceived(result)
      onPipelineComplete?.(result)
    } catch {
      const fallback: VerdictResult = {
        model1: { verdict: 'DENIED', confidence: 0, reason: 'API unavailable' },
        model2: { verdict: 'DENIED', confidence: 0, reason: 'API unavailable' },
        consensus: 'DENIED',
        proposal: scenario.proposal,
        timestamp: Date.now(),
      }
      setVerdict(fallback)
      onVerdictReceived(fallback)
      onPipelineComplete?.(fallback)
    }

    setRunState('done')
    setCompletedIds((prev) => new Set(prev).add(scenario.id))
  }, [onVerdictReceived, onPipelineStart, onPipelineComplete, onPipelineStep])

  async function runPhaseScenarios(scenarios: DemoScenario[], phase: number, fastMode = false) {
    setRunningPhase(phase)
    cancelRef.current = false

    for (let idx = 0; idx < scenarios.length; idx++) {
      if (cancelRef.current) break
      await runScenario(scenarios[idx])

      if (idx < scenarios.length - 1 && !cancelRef.current) {
        const isIncident = scenarios[idx].id >= 101
        const delay = fastMode ? 1500 : isIncident ? AUTO_ADVANCE_DELAY + 2000 : AUTO_ADVANCE_DELAY
        setNextScenarioName(scenarios[idx + 1].title)
        setRunState('waiting')
        await new Promise((r) => setTimeout(r, delay))
      }
    }

    setNextScenarioName(null)
    setRunningPhase(null)
  }

  function stopDemo() {
    cancelRef.current = true
    setRunningPhase(null)
    setNextScenarioName(null)
    setRunState('done')
  }

  const phase1Completed = [...completedIds].filter((id) => SAFE_SCENARIOS.some((s) => s.id === id)).length
  const phase2Completed = [...completedIds].filter((id) => INCIDENT_SCENARIOS.some((s) => s.id === id)).length
  const phase3Completed = [...completedIds].filter((id) => DEMO_SCENARIOS.some((s) => s.id === id)).length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gray-900 rounded-2xl border border-gray-800 p-8">
        <h2 className="text-4xl font-black text-white">Live Defense Demo</h2>
        <p className="text-xl text-gray-400 mt-2">
          3 baselines train the system, then 4 real 2025 incidents are recreated and blocked live.
          Every verdict flows through the Chainlink CRE pipeline in real-time.
        </p>
      </div>

      {/* ─── Phase 1: Baselines ─── */}
      <div className="space-y-5">
        <div className="bg-green-900/20 rounded-2xl border border-green-500/20 p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-green-400/20 flex items-center justify-center shrink-0">
                <svg className="w-5 h-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </div>
              <div>
                <h3 className="text-2xl font-black text-green-400 uppercase tracking-widest">Phase 1: Training Baseline</h3>
                <p className="text-lg text-green-400/60 mt-0.5">
                  Normal operations establish what &quot;good behavior&quot; looks like — the system learns each agent&apos;s patterns
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              {runningPhase === 1 && (
                <button
                  onClick={stopDemo}
                  className="px-5 py-3 bg-gray-700 hover:bg-gray-600 text-white text-lg font-bold rounded-2xl transition-colors flex items-center gap-2"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 00-1 1v4a1 1 0 001 1h4a1 1 0 001-1V8a1 1 0 00-1-1H8z" clipRule="evenodd" />
                  </svg>
                  Stop
                </button>
              )}
              <button
                onClick={() => runPhaseScenarios(SAFE_SCENARIOS, 1)}
                disabled={runningPhase !== null}
                className="px-6 py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-700 text-white text-lg font-bold rounded-2xl transition-colors flex items-center gap-2"
              >
                {runningPhase === 1 ? (
                  <>
                    <span className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    Running...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                    </svg>
                    Run Phase 1
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Phase 1 progress */}
          {phase1Completed > 0 && (
            <div className="mt-4 pt-4 border-t border-green-500/20">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-sm font-bold text-green-400/60">Baselines</span>
                <span className="text-sm font-bold text-green-400 tabular-nums">{phase1Completed} / {SAFE_SCENARIOS.length}</span>
              </div>
              <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500 ease-out bg-green-500"
                  style={{ width: `${(phase1Completed / SAFE_SCENARIOS.length) * 100}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {SAFE_SCENARIOS.map((scenario) => {
          const isActive = activeScenario?.id === scenario.id
          const isCompleted = completedIds.has(scenario.id)

          return (
            <div key={scenario.id}>
              <ScenarioCard
                scenario={scenario}
                isActive={isActive}
                isCompleted={isCompleted}
                isBaseline={true}
                runState={runState}
                verdict={isActive ? verdict : null}
                activeStep={activeStep}
                nextScenarioName={nextScenarioName}
                onRun={() => runScenario(scenario)}
                disabled={runState === 'running' || runningPhase !== null}
              />
            </div>
          )
        })}
      </div>

      {/* ─── Phase 2: 2025 Incident Replays ─── */}
      <div className="space-y-5">
        <div className="bg-red-900/20 rounded-2xl border border-red-500/20 p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-red-400/20 flex items-center justify-center shrink-0">
                <svg className="w-5 h-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div>
                <h3 className="text-2xl font-black text-red-400 uppercase tracking-widest">Phase 2: 2025 Incident Recreation</h3>
                <p className="text-lg text-red-400/60 mt-0.5">
                  Real attacks that happened in 2025 — recreated and blocked live. Every incident from the Problem Statement, stopped by SentinelCRE.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              {runningPhase === 2 && (
                <button
                  onClick={stopDemo}
                  className="px-5 py-3 bg-gray-700 hover:bg-gray-600 text-white text-lg font-bold rounded-2xl transition-colors flex items-center gap-2"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 00-1 1v4a1 1 0 001 1h4a1 1 0 001-1V8a1 1 0 00-1-1H8z" clipRule="evenodd" />
                  </svg>
                  Stop
                </button>
              )}
              <button
                onClick={() => runPhaseScenarios(INCIDENT_SCENARIOS, 2)}
                disabled={runningPhase !== null}
                className="px-6 py-3 bg-red-600 hover:bg-red-700 disabled:bg-gray-700 text-white text-lg font-bold rounded-2xl transition-colors flex items-center gap-2"
              >
                {runningPhase === 2 ? (
                  <>
                    <span className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    Running...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                    </svg>
                    Run Phase 2
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Phase 2 progress */}
          {phase2Completed > 0 && (
            <div className="mt-4 pt-4 border-t border-red-500/20">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-sm font-bold text-red-400/60">Incidents</span>
                <span className="text-sm font-bold text-red-400 tabular-nums">{phase2Completed} / {INCIDENT_SCENARIOS.length}</span>
              </div>
              <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500 ease-out bg-red-500"
                  style={{ width: `${(phase2Completed / INCIDENT_SCENARIOS.length) * 100}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {INCIDENT_SCENARIOS.map((scenario) => {
          const isActive = activeScenario?.id === scenario.id
          const isCompleted = completedIds.has(scenario.id)

          return (
            <div key={scenario.id}>
              <ScenarioCard
                scenario={scenario}
                isActive={isActive}
                isCompleted={isCompleted}
                isBaseline={false}
                runState={runState}
                verdict={isActive ? verdict : null}
                activeStep={activeStep}
                nextScenarioName={nextScenarioName}
                onRun={() => runScenario(scenario)}
                disabled={runState === 'running' || runningPhase !== null}
              />
            </div>
          )
        })}
      </div>

      {/* ─── Phase 3: Additional Attack Scenarios ─── */}
      <div className="space-y-5">
        <div className="bg-orange-900/20 rounded-2xl border border-orange-500/20 p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-orange-400/20 flex items-center justify-center shrink-0">
                <svg className="w-5 h-5 text-orange-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M12.395 2.553a1 1 0 00-1.45-.385c-.345.23-.614.558-.822.88-.214.33-.403.713-.57 1.116-.334.804-.614 1.768-.84 2.734a31.365 31.365 0 00-.613 3.58 2.64 2.64 0 01-.945-1.067c-.328-.68-.398-1.534-.398-2.654A1 1 0 005.05 6.05 6.981 6.981 0 003 11a7 7 0 1011.95-4.95c-.592-.591-.98-.985-1.348-1.467-.363-.476-.724-1.063-1.207-2.03zM12.12 15.12A3 3 0 017 13s.879.5 2.5.5c0-1 .5-2 1-3 .5 1 1 3 2 3.5a3 3 0 01-.38 1.12z" clipRule="evenodd" />
                </svg>
              </div>
              <div>
                <h3 className="text-2xl font-black text-orange-400 uppercase tracking-widest">Phase 3: Additional Attack Vectors</h3>
                <p className="text-lg text-orange-400/60 mt-0.5">
                  11 more attack vectors — policy violations, behavioral edge cases, and evasion techniques
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              {runningPhase === 3 && (
                <button
                  onClick={stopDemo}
                  className="px-5 py-3 bg-gray-700 hover:bg-gray-600 text-white text-lg font-bold rounded-2xl transition-colors flex items-center gap-2"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 00-1 1v4a1 1 0 001 1h4a1 1 0 001-1V8a1 1 0 00-1-1H8z" clipRule="evenodd" />
                  </svg>
                  Stop
                </button>
              )}
              <button
                onClick={() => runPhaseScenarios(DEMO_SCENARIOS, 3, true)}
                disabled={runningPhase !== null}
                className="px-6 py-3 bg-orange-600 hover:bg-orange-700 disabled:bg-gray-700 text-white text-lg font-bold rounded-2xl transition-colors flex items-center gap-2"
              >
                {runningPhase === 3 ? (
                  <>
                    <span className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    Running...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                    </svg>
                    Run Phase 3
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Phase 3 progress */}
          {phase3Completed > 0 && (
            <div className="mt-4 pt-4 border-t border-orange-500/20">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-sm font-bold text-orange-400/60">Scenarios</span>
                <span className="text-sm font-bold text-orange-400 tabular-nums">{phase3Completed} / {DEMO_SCENARIOS.length}</span>
              </div>
              <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500 ease-out bg-orange-500"
                  style={{ width: `${(phase3Completed / DEMO_SCENARIOS.length) * 100}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {additionalScenarios.map((scenario, idx) => {
          const isActive = activeScenario?.id === scenario.id
          const isCompleted = completedIds.has(scenario.id)

          return (
            <div key={scenario.id}>
              <ScenarioCard
                scenario={scenario}
                isActive={isActive}
                isCompleted={isCompleted}
                isBaseline={false}
                runState={runState}
                verdict={isActive ? verdict : null}
                activeStep={activeStep}
                nextScenarioName={nextScenarioName}
                onRun={() => runScenario(scenario)}
                disabled={runState === 'running' || runningPhase !== null}
                label={`Scenario ${idx + 1}: `}
              />
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ─── Extracted Scenario Card ─── */

function ScenarioCard({
  scenario,
  isActive,
  isCompleted,
  isBaseline,
  runState,
  verdict,
  activeStep,
  nextScenarioName,
  onRun,
  disabled,
  label,
}: {
  scenario: DemoScenario
  isActive: boolean
  isCompleted: boolean
  isBaseline: boolean
  runState: RunState
  verdict: VerdictResult | null
  activeStep: number
  nextScenarioName: string | null
  onRun: () => void
  disabled: boolean
  label?: string
}) {
  const sev = SEVERITY_BADGE[scenario.severity]

  return (
    <div
      className={`bg-gray-900 rounded-2xl border-2 transition-all duration-300 ${
        isActive && runState === 'running'
          ? 'border-yellow-500/50 shadow-2xl shadow-yellow-500/10'
          : isActive && (runState === 'done' || runState === 'waiting')
            ? verdict?.consensus === 'APPROVED'
              ? 'border-green-500/50 shadow-2xl shadow-green-500/10'
              : 'border-red-500/50 shadow-2xl shadow-red-500/10'
            : isCompleted
              ? 'border-gray-700'
              : 'border-gray-800'
      }`}
    >
      <div className="p-6">
        <div className="flex items-start justify-between gap-8">
          <div className="flex-1">
            <div className="flex items-center gap-4 mb-1">
              <h3 className={`text-3xl font-black ${isBaseline ? 'text-green-400' : 'text-white'}`}>
                {label ?? ''}{scenario.title}
              </h3>
              {!isBaseline && (
                <span className={`text-base px-4 py-1.5 rounded-full border-2 font-bold ${sev.bg} ${sev.text} ${sev.border}`}>
                  {scenario.severity}
                </span>
              )}
              {isBaseline && (
                <span className="text-base px-4 py-1.5 rounded-full border-2 font-bold bg-green-400/10 text-green-400 border-green-400/30">
                  SAFE
                </span>
              )}
            </div>
            <p className="text-2xl text-gray-300 mb-2 font-semibold">{scenario.subtitle}</p>
            <p className="text-xl text-gray-400 leading-snug">{scenario.narrative}</p>

            <div className="flex items-center gap-4 mt-3">
              <span className="text-base text-gray-500 uppercase tracking-widest font-bold">Attack Vector</span>
              <span className={`text-xl font-black ${isBaseline ? 'text-green-400' : 'text-red-400'}`}>
                {scenario.attackType}
              </span>
            </div>
          </div>

          {/* Run Button / Status */}
          <div className="flex flex-col items-end gap-3 pt-2 shrink-0">
            {isActive && runState === 'running' ? (
              <span className="flex items-center gap-3 text-lg text-yellow-400 bg-yellow-400/10 px-6 py-3 rounded-2xl font-bold">
                <span className="w-5 h-5 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin" />
                Evaluating...
              </span>
            ) : isActive && (runState === 'done' || runState === 'waiting') && verdict ? (
              <span className={`text-4xl font-black ${
                verdict.consensus === 'APPROVED' ? 'text-green-400' : 'text-red-400'
              }`}>
                {verdict.consensus === 'APPROVED' ? 'APPROVED' : 'BLOCKED'}
              </span>
            ) : isCompleted ? (
              <span className={`text-lg font-bold ${
                scenario.expectedOutcome === 'APPROVED' ? 'text-green-400/60' : 'text-red-400/60'
              }`}>
                {scenario.expectedOutcome === 'APPROVED' ? 'Passed' : 'Blocked'}
              </span>
            ) : (
              <button
                onClick={onRun}
                disabled={disabled}
                className={`px-7 py-3.5 text-lg font-bold rounded-2xl transition-colors ${
                  isBaseline
                    ? 'bg-green-600 hover:bg-green-700 disabled:bg-gray-700 text-white'
                    : 'bg-red-600 hover:bg-red-700 disabled:bg-gray-700 text-white'
                }`}
              >
                {isBaseline ? 'Run Baseline' : 'Launch Attack'}
              </button>
            )}
          </div>
        </div>

        {/* Step-by-step animation */}
        {isActive && runState !== 'idle' && (
          <div className="mt-4 pt-4 border-t border-gray-800">
            <h4 className="text-xl font-black text-gray-300 uppercase tracking-widest mb-2">
              Kill Chain
            </h4>
            <div className="space-y-0">
              {scenario.steps.map((step, i) => {
                const isDone = runState === 'done' || runState === 'waiting' || i < activeStep
                const isCurrent = runState === 'running' && i === activeStep

                return (
                  <div
                    key={i}
                    className={`flex items-center gap-4 px-4 py-2 rounded-lg transition-all duration-300 ${
                      isCurrent
                        ? 'bg-yellow-400/10 border-2 border-yellow-400/30'
                        : isDone
                          ? 'bg-gray-800/30 border-2 border-transparent'
                          : 'opacity-30 border-2 border-transparent'
                    }`}
                  >
                    <div className="flex-shrink-0">
                      {isCurrent ? (
                        <span className="w-6 h-6 border-3 border-yellow-400 border-t-transparent rounded-full animate-spin block" />
                      ) : isDone ? (
                        <svg className={`w-6 h-6 ${
                          scenario.expectedOutcome === 'APPROVED' && i === scenario.steps.length - 1
                            ? 'text-green-400'
                            : i >= scenario.steps.length - 2
                              ? 'text-red-400'
                              : 'text-gray-500'
                        }`} fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      ) : (
                        <span className="w-6 h-6 rounded-full border-2 border-gray-700 block" />
                      )}
                    </div>

                    <span className={`text-lg ${
                      isCurrent
                        ? 'text-yellow-300 font-bold'
                        : isDone
                          ? 'text-gray-300 font-medium'
                          : 'text-gray-600'
                    }`}>
                      <span className="text-gray-500 mr-3 font-mono font-bold">Step {i + 1}.</span>
                      {step}
                    </span>
                  </div>
                )
              })}
            </div>

            {/* Next Scenario Prompt — auto-advancing */}
            {isActive && runState === 'waiting' && nextScenarioName && (
              <div className="mt-3 flex items-center justify-between p-3 px-5 rounded-xl bg-blue-500/10 border-2 border-blue-500/30">
                <div className="flex items-center gap-3">
                  <span className="w-5 h-5 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                  <span className="text-lg text-blue-400 font-bold">Up Next:</span>
                  <span className="text-lg text-gray-300 font-semibold">{nextScenarioName}</span>
                </div>
                <span className="text-base text-blue-400/60 font-semibold">Auto-advancing...</span>
              </div>
            )}

            {/* Verdict Summary */}
            {(runState === 'done' || runState === 'waiting') && verdict && (
              <VerdictSummary verdict={verdict} />
            )}
          </div>
        )}
      </div>
    </div>
  )
}

/* ─── Extracted Verdict Summary ─── */

function VerdictSummary({ verdict }: { verdict: VerdictResult }) {
  const skippedByPolicy = verdict.consensus === 'DENIED' && verdict.anomalyScore === 0 && !verdict.anomalyFlagged

  return (
    <div className={`mt-3 p-4 rounded-xl border-2 ${
      verdict.consensus === 'APPROVED'
        ? 'bg-green-500/10 border-green-500/30'
        : 'bg-red-500/10 border-red-500/30'
    }`}>
      <div className="flex items-center justify-between mb-2">
        <span className={`text-2xl font-black ${
          verdict.consensus === 'APPROVED' ? 'text-green-400' : 'text-red-400'
        }`}>
          Verdict: {verdict.consensus}
        </span>
        {verdict.severity && (
          <span className={`text-base px-4 py-1.5 rounded-full border-2 font-bold ${
            SEVERITY_BADGE[verdict.severity].bg
          } ${SEVERITY_BADGE[verdict.severity].text} ${SEVERITY_BADGE[verdict.severity].border}`}>
            {verdict.severity} Severity
          </span>
        )}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className={`p-3 rounded-lg ${
          verdict.model1.verdict === 'APPROVED' ? 'bg-green-400/5' : 'bg-red-400/5'
        }`}>
          <div className="flex items-center gap-3 mb-1">
            <span className="text-lg text-gray-400 font-semibold">Model 1 (Claude)</span>
            <span className={`text-base font-black ${verdict.model1.verdict === 'APPROVED' ? 'text-green-400' : 'text-red-400'}`}>
              {verdict.model1.verdict}
            </span>
          </div>
          <p className="text-base text-gray-400 leading-snug">{verdict.model1.reason}</p>
        </div>
        <div className={`p-3 rounded-lg ${
          verdict.model2.verdict === 'APPROVED' ? 'bg-green-400/5' : 'bg-red-400/5'
        }`}>
          <div className="flex items-center gap-3 mb-1">
            <span className="text-lg text-gray-400 font-semibold">Model 2 (GPT-4)</span>
            <span className={`text-base font-black ${verdict.model2.verdict === 'APPROVED' ? 'text-green-400' : 'text-red-400'}`}>
              {verdict.model2.verdict}
            </span>
          </div>
          <p className="text-base text-gray-400 leading-snug">{verdict.model2.reason}</p>
        </div>
      </div>

      {/* Behavioral Risk Analysis (Layer 2) */}
      {verdict.anomalyScore != null && (
        <div className="mt-3 pt-3 border-t border-gray-700/50">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <span className="text-lg font-black text-orange-400 uppercase tracking-widest">
                Behavioral Risk
              </span>
              <span className={`text-base px-3 py-1 rounded-full font-bold ${
                skippedByPolicy
                  ? 'bg-gray-500/10 text-gray-400 border border-gray-500/30'
                  : verdict.anomalyFlagged
                    ? 'bg-red-400/10 text-red-400 border border-red-400/30'
                    : (verdict.anomalyScore ?? 0) >= 25
                      ? 'bg-orange-400/10 text-orange-400 border border-orange-400/30'
                      : 'bg-green-400/10 text-green-400 border border-green-400/30'
              }`}>
                {skippedByPolicy
                  ? 'SKIPPED'
                  : verdict.anomalyFlagged
                    ? 'FLAGGED'
                    : (verdict.anomalyScore ?? 0) >= 25
                      ? 'ELEVATED'
                      : 'NORMAL'}
              </span>
            </div>
            {skippedByPolicy ? (
              <span className="text-base text-gray-500 italic">
                Caught by policy — Layer 2 not needed
              </span>
            ) : (
              <span className={`text-2xl font-black ${
                verdict.anomalyFlagged ? 'text-red-400' : (verdict.anomalyScore ?? 0) >= 25 ? 'text-orange-400' : 'text-green-400'
              }`}>
                {verdict.anomalyFlagged ? 'TRIGGERED' : 'PASS'}
              </span>
            )}
          </div>
          {!skippedByPolicy && verdict.anomalyDimensions && verdict.anomalyDimensions.length > 0 && (
            <div className="space-y-1.5">
              {verdict.anomalyDimensions.map((dim, idx) => (
                <div key={idx} className="flex items-center gap-3">
                  <div className="w-32 shrink-0">
                    <span className={`text-lg font-semibold ${dim.fired ? 'text-orange-400' : 'text-gray-600'}`}>
                      {dim.name}
                    </span>
                  </div>
                  <div className="flex-1 h-2 bg-gray-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        dim.fired ? 'bg-orange-400' : 'bg-gray-700'
                      }`}
                      style={{ width: `${(dim.score / dim.maxWeight) * 100}%` }}
                    />
                  </div>
                  <span className={`text-base font-bold w-10 text-right ${dim.fired ? 'text-orange-400' : 'text-gray-700'}`}>
                    {dim.fired ? 'HIT' : '—'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
