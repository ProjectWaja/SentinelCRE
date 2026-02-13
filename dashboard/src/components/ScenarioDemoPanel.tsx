'use client'

import { useState, useCallback, useRef } from 'react'
import { DEMO_SCENARIOS, SAFE_SCENARIO, type DemoScenario, type VerdictResult } from '@/lib/demo-scenarios'
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
}: {
  onVerdictReceived: (v: VerdictResult) => void
  onPipelineStart?: (description: string) => void
  onPipelineComplete?: (consensus: 'APPROVED' | 'DENIED') => void
}) {
  const [activeScenario, setActiveScenario] = useState<DemoScenario | null>(null)
  const [runState, setRunState] = useState<RunState>('idle')
  const [activeStep, setActiveStep] = useState(-1)
  const [verdict, setVerdict] = useState<VerdictResult | null>(null)
  const [runningAll, setRunningAll] = useState(false)
  const [completedIds, setCompletedIds] = useState<Set<number>>(new Set())
  const [nextScenarioName, setNextScenarioName] = useState<string | null>(null)
  const continueRef = useRef<(() => void) | null>(null)

  const allScenarios = [SAFE_SCENARIO, ...DEMO_SCENARIOS]

  const runScenario = useCallback(async (scenario: DemoScenario) => {
    setActiveScenario(scenario)
    setRunState('running')
    setVerdict(null)
    setActiveStep(0)
    onPipelineStart?.(scenario.title)

    for (let i = 0; i < scenario.steps.length; i++) {
      setActiveStep(i)
      await new Promise((r) => setTimeout(r, 500))
    }

    try {
      const result = await evaluateAction(scenario.proposal)
      setVerdict(result)
      onVerdictReceived(result)
      onPipelineComplete?.(result.consensus === 'APPROVED' ? 'APPROVED' : 'DENIED')
    } catch {
      onPipelineComplete?.('DENIED')
    }

    setRunState('done')
    setCompletedIds((prev) => new Set(prev).add(scenario.id))
  }, [onVerdictReceived, onPipelineStart, onPipelineComplete])

  function handleContinue() {
    continueRef.current?.()
    continueRef.current = null
  }

  function waitForContinue(nextName: string): Promise<void> {
    return new Promise((resolve) => {
      setNextScenarioName(nextName)
      setRunState('waiting')
      continueRef.current = resolve
    })
  }

  async function runAllScenarios() {
    setRunningAll(true)
    setCompletedIds(new Set())

    const all = [SAFE_SCENARIO, ...DEMO_SCENARIOS]

    for (let idx = 0; idx < all.length; idx++) {
      await runScenario(all[idx])

      // After each scenario (except the last), wait for user to click "Next"
      if (idx < all.length - 1) {
        await waitForContinue(all[idx + 1].title)
      }
    }

    setNextScenarioName(null)
    setRunningAll(false)
  }

  return (
    <div className="space-y-6">
      {/* Header + Run All */}
      <div className="bg-gray-900 rounded-2xl border border-gray-800 p-8">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-4xl font-black text-white">Attack Scenarios</h2>
            <p className="text-2xl text-gray-400 mt-2">
              5 real-world attack vectors — each blocked by SentinelCRE&apos;s defense layers
            </p>
          </div>
          {runningAll && runState === 'waiting' ? (
            <button
              onClick={handleContinue}
              className="px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white text-xl font-bold rounded-2xl transition-colors flex items-center gap-3 shrink-0 animate-pulse"
            >
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
              Next Scenario
            </button>
          ) : (
            <button
              onClick={runAllScenarios}
              disabled={runningAll}
              className="px-8 py-4 bg-red-600 hover:bg-red-700 disabled:bg-gray-700 text-white text-xl font-bold rounded-2xl transition-colors flex items-center gap-3 shrink-0"
            >
              {runningAll ? (
                <>
                  <span className="w-6 h-6 border-3 border-white/40 border-t-white rounded-full animate-spin" />
                  Running Demo...
                </>
              ) : (
                <>
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                  </svg>
                  Run Full Demo
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Scenario Cards */}
      <div className="space-y-5">
        {allScenarios.map((scenario) => {
          const isActive = activeScenario?.id === scenario.id
          const isCompleted = completedIds.has(scenario.id)
          const isBaseline = scenario.id === 0
          const sev = SEVERITY_BADGE[scenario.severity]

          return (
            <div
              key={scenario.id}
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
                        {scenario.title}
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

                    {/* Attack Type Badge */}
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
                        onClick={() => runScenario(scenario)}
                        disabled={runState === 'running' || runningAll}
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

                    {/* Next Scenario Prompt */}
                    {isActive && runState === 'waiting' && nextScenarioName && (
                      <div className="mt-3 flex items-center justify-between p-3 px-5 rounded-xl bg-blue-500/10 border-2 border-blue-500/30">
                        <div>
                          <span className="text-lg text-blue-400 font-bold">Up Next:</span>
                          <span className="text-lg text-gray-300 ml-3 font-semibold">{nextScenarioName}</span>
                        </div>
                        <button
                          onClick={handleContinue}
                          className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-lg font-bold rounded-xl transition-colors flex items-center gap-2"
                        >
                          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
                          </svg>
                          Continue
                        </button>
                      </div>
                    )}

                    {/* Verdict Summary */}
                    {(runState === 'done' || runState === 'waiting') && verdict && (
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
                              <span className="text-base text-gray-400 font-semibold">Model 1 (Claude)</span>
                              <span className={`text-base font-black ${verdict.model1.verdict === 'APPROVED' ? 'text-green-400' : 'text-red-400'}`}>
                                {verdict.model1.verdict}
                              </span>
                              <span className="text-sm text-gray-500 font-bold">{verdict.model1.confidence}%</span>
                            </div>
                            <p className="text-sm text-gray-400 leading-snug">{verdict.model1.reason}</p>
                          </div>
                          <div className={`p-3 rounded-lg ${
                            verdict.model2.verdict === 'APPROVED' ? 'bg-green-400/5' : 'bg-red-400/5'
                          }`}>
                            <div className="flex items-center gap-3 mb-1">
                              <span className="text-base text-gray-400 font-semibold">Model 2 (GPT-4)</span>
                              <span className={`text-base font-black ${verdict.model2.verdict === 'APPROVED' ? 'text-green-400' : 'text-red-400'}`}>
                                {verdict.model2.verdict}
                              </span>
                              <span className="text-sm text-gray-500 font-bold">{verdict.model2.confidence}%</span>
                            </div>
                            <p className="text-sm text-gray-400 leading-snug">{verdict.model2.reason}</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
