'use client'

import { useState, useEffect, useRef } from 'react'

export interface PipelineRun {
  id: string
  description: string
  consensus: 'APPROVED' | 'DENIED' | null
  startedAt: number
  /** Pipeline step index where the attack was caught (undefined = full pass) */
  catchStep?: number
  /** Reason the attack was blocked at this step */
  catchReason?: string
  /** Live step during scenario execution (before verdict) — maps to pipeline step */
  liveStep?: number
  /** Total scenario steps (used for proportional mapping) */
  totalSteps?: number
}

const PIPELINE_STEPS = [
  {
    service: 'HTTPCapability',
    action: 'trigger()',
    label: 'Receive Proposal',
    desc: 'CRE HTTP Trigger receives agent action proposal',
    color: 'blue',
    delay: 0,
  },
  {
    service: 'EVMClient',
    action: 'callContract()',
    label: 'Read Policy',
    desc: 'Read agent policy from SentinelGuardian via EVMClient',
    color: 'cyan',
    delay: 400,
  },
  {
    service: 'BehavioralEngine',
    action: 'analyzeAll()',
    label: 'Behavioral Risk Scoring',
    desc: '7-dimension anomaly detection — probing, velocity, drift, deviation',
    color: 'orange',
    delay: 700,
  },
  {
    service: 'HTTPClient',
    action: 'sendRequest()',
    label: 'AI Model 1 (Claude)',
    desc: 'Evaluate with Claude — behavioral context injected',
    color: 'purple',
    delay: 1000,
  },
  {
    service: 'HTTPClient',
    action: 'sendRequest()',
    label: 'AI Model 2 (GPT-4)',
    desc: 'Evaluate with GPT-4 — behavioral context injected',
    color: 'purple',
    delay: 1200,
  },
  {
    service: 'ConsensusAggregation',
    action: 'identical(verdict)',
    label: 'DON Consensus',
    desc: 'BFT consensus — all DON nodes must agree on verdict',
    color: 'yellow',
    delay: 1600,
  },
  {
    service: 'EVMClient',
    action: 'writeReport()',
    label: 'Write Verdict',
    desc: 'Submit signed verdict report to SentinelGuardian',
    color: 'green',
    delay: 2000,
  },
  {
    service: 'SentinelGuardian',
    action: 'processVerdict()',
    label: 'On-Chain Policy',
    desc: 'PolicyLib.checkAll() — value, target, function, rate, mint, PoR',
    color: 'red',
    delay: 2400,
  },
]

const COLOR_MAP: Record<string, { dot: string; text: string; bg: string; border: string; glow: string }> = {
  blue: { dot: 'bg-blue-400', text: 'text-blue-400', bg: 'bg-blue-400/10', border: 'border-blue-400/30', glow: 'shadow-blue-400/20' },
  cyan: { dot: 'bg-cyan-400', text: 'text-cyan-400', bg: 'bg-cyan-400/10', border: 'border-cyan-400/30', glow: 'shadow-cyan-400/20' },
  orange: { dot: 'bg-orange-400', text: 'text-orange-400', bg: 'bg-orange-400/10', border: 'border-orange-400/30', glow: 'shadow-orange-400/20' },
  purple: { dot: 'bg-purple-400', text: 'text-purple-400', bg: 'bg-purple-400/10', border: 'border-purple-400/30', glow: 'shadow-purple-400/20' },
  yellow: { dot: 'bg-yellow-400', text: 'text-yellow-400', bg: 'bg-yellow-400/10', border: 'border-yellow-400/30', glow: 'shadow-yellow-400/20' },
  green: { dot: 'bg-green-400', text: 'text-green-400', bg: 'bg-green-400/10', border: 'border-green-400/30', glow: 'shadow-green-400/20' },
  red: { dot: 'bg-red-400', text: 'text-red-400', bg: 'bg-red-400/10', border: 'border-red-400/30', glow: 'shadow-red-400/20' },
}

/** Map a scenario step index to a pipeline step index (proportional) */
function mapToPipelineStep(scenarioStep: number, totalScenarioSteps: number): number {
  if (totalScenarioSteps <= 1) return 0
  return Math.min(
    PIPELINE_STEPS.length - 1,
    Math.round(scenarioStep * (PIPELINE_STEPS.length - 1) / (totalScenarioSteps - 1)),
  )
}

export default function ChainlinkActivityPanel({
  currentRun,
}: {
  currentRun: PipelineRun | null
}) {
  const [activeStep, setActiveStep] = useState(-1)
  const [completedSteps, setCompletedSteps] = useState<number[]>([])
  const [blockedStep, setBlockedStep] = useState(-1)
  const prevRunId = useRef<string | null>(null)
  const prevLiveStep = useRef<number>(-1)

  // Live step tracking — animate pipeline in real-time during scenario execution
  useEffect(() => {
    if (!currentRun || currentRun.consensus) return
    if (currentRun.liveStep == null || currentRun.totalSteps == null) return

    const pipelineIdx = mapToPipelineStep(currentRun.liveStep, currentRun.totalSteps)

    // Reset on new run
    if (currentRun.id !== prevRunId.current) {
      prevRunId.current = currentRun.id
      prevLiveStep.current = -1
      setActiveStep(-1)
      setCompletedSteps([])
      setBlockedStep(-1)
    }

    // Mark previous pipeline steps as completed, set current as active
    if (pipelineIdx !== prevLiveStep.current) {
      const newCompleted: number[] = []
      for (let i = 0; i < pipelineIdx; i++) {
        newCompleted.push(i)
      }
      setCompletedSteps(newCompleted)
      setActiveStep(pipelineIdx)
      prevLiveStep.current = pipelineIdx
    }
  }, [currentRun?.id, currentRun?.liveStep, currentRun?.totalSteps, currentRun?.consensus])

  // Final verdict animation — plays after consensus is determined
  useEffect(() => {
    if (!currentRun || !currentRun.consensus) return
    // Only run the final animation once per run
    if (currentRun.id === prevRunId.current && prevLiveStep.current === -2) return

    prevRunId.current = currentRun.id
    prevLiveStep.current = -2 // sentinel: final animation played

    const lastStep = currentRun.catchStep ?? PIPELINE_STEPS.length - 1
    const shouldBlock = currentRun.consensus === 'DENIED' && currentRun.catchStep !== undefined

    // Quick final sweep: complete remaining steps and show catch
    setBlockedStep(-1)

    for (let i = 0; i <= lastStep; i++) {
      const delay = i * 150 // fast sweep

      setTimeout(() => {
        setActiveStep(i)
        setCompletedSteps((prev) => {
          const s = new Set(prev)
          for (let j = 0; j < i; j++) s.add(j)
          return [...s]
        })
      }, delay)

      setTimeout(() => {
        if (i === lastStep && shouldBlock) {
          setBlockedStep(i)
        } else {
          setCompletedSteps((prev) => [...new Set([...prev, i])])
        }
        if (i === lastStep) {
          setTimeout(() => setActiveStep(-1), 800)
        }
      }, delay + 120)
    }
  }, [currentRun?.id, currentRun?.consensus])

  const isPending = currentRun && !currentRun.consensus
  const isAnimating = activeStep >= 0
  const isIdle = !currentRun || (!isAnimating && !isPending && blockedStep === -1)

  return (
    <div className={`bg-gray-900 rounded-2xl border p-5 transition-colors duration-500 ${
      isPending || isAnimating
        ? 'border-yellow-500/30'
        : blockedStep >= 0
          ? 'border-red-500/30'
          : 'border-gray-800'
    }`}>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xl font-black text-white uppercase tracking-widest">
          CRE Pipeline
        </h2>
        {isPending && (
          <span className="flex items-center gap-2 text-base text-yellow-400 bg-yellow-400/10 px-4 py-1.5 rounded-full font-bold">
            <span className="w-2.5 h-2.5 rounded-full bg-yellow-400 animate-pulse" />
            Evaluating...
          </span>
        )}
        {!isPending && isAnimating && (
          <span className="flex items-center gap-2 text-base text-yellow-400 bg-yellow-400/10 px-4 py-1.5 rounded-full font-bold">
            <span className="w-2.5 h-2.5 rounded-full bg-yellow-400 animate-pulse" />
            Processing
          </span>
        )}
        {!isPending && !isAnimating && currentRun?.consensus && (
          <span
            className={`text-lg px-4 py-1.5 rounded-full font-black ${
              currentRun.consensus === 'APPROVED'
                ? 'text-green-400 bg-green-400/10'
                : 'text-red-400 bg-red-400/10'
            }`}
          >
            {currentRun.consensus === 'APPROVED' ? 'APPROVED' : 'BLOCKED'}
          </span>
        )}
      </div>

      <div className="space-y-0">
        {PIPELINE_STEPS.map((step, i) => {
          const colors = COLOR_MAP[step.color]
          const isBlocked = blockedStep === i
          const isActive = activeStep === i && !isBlocked
          const isCompleted = completedSteps.includes(i)
          const isSkipped =
            currentRun?.catchStep !== undefined &&
            currentRun.consensus === 'DENIED' &&
            i > currentRun.catchStep &&
            (blockedStep >= 0 || completedSteps.length > 0)

          return (
            <div
              key={i}
              className={`flex items-start gap-3 rounded-lg px-3 py-2 transition-all duration-300 ${
                isBlocked
                  ? 'bg-red-500/10 border border-red-500/40 shadow-lg shadow-red-500/20'
                  : isActive
                    ? `${colors.bg} border ${colors.border} shadow-lg ${colors.glow}`
                    : isCompleted
                      ? 'bg-gray-800/30 border border-transparent'
                      : isSkipped
                        ? 'bg-transparent border border-gray-800/30 opacity-20'
                        : 'bg-transparent border border-transparent opacity-40'
              }`}
            >
              {/* Step indicator */}
              <div className="flex flex-col items-center mt-1">
                <div
                  className={`w-3 h-3 rounded-full transition-all duration-300 ${
                    isBlocked
                      ? 'bg-red-500 animate-pulse scale-125'
                      : isActive
                        ? `${colors.dot} animate-pulse scale-125`
                        : isCompleted
                          ? currentRun?.consensus === 'APPROVED' && i === PIPELINE_STEPS.length - 1
                            ? 'bg-green-400'
                            : 'bg-gray-600'
                          : isSkipped
                            ? 'bg-gray-800 border border-gray-700'
                            : 'bg-gray-800 border-2 border-gray-700'
                  }`}
                />
                {i < PIPELINE_STEPS.length - 1 && (
                  <div
                    className={`w-0.5 h-3 mt-0.5 transition-colors duration-300 ${
                      isBlocked
                        ? 'bg-red-500/30'
                        : isCompleted
                          ? 'bg-gray-700'
                          : 'bg-gray-800'
                    }`}
                  />
                )}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-base font-bold transition-colors duration-300 ${
                        isBlocked
                          ? 'text-red-400'
                          : isActive
                            ? colors.text
                            : isCompleted
                              ? 'text-gray-200'
                              : isSkipped
                                ? 'text-gray-700 line-through'
                                : 'text-gray-600'
                      }`}
                    >
                      {step.label}
                    </span>
                    {isBlocked && (
                      <span className="text-xs font-black text-red-400 bg-red-500/20 px-2 py-0.5 rounded-full border border-red-500/40 animate-pulse uppercase tracking-widest">
                        Blocked
                      </span>
                    )}
                    {isSkipped && (
                      <span className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                        Skipped
                      </span>
                    )}
                  </div>
                  <span
                    className={`font-mono text-sm transition-colors duration-300 ${
                      isBlocked
                        ? 'text-red-400/60'
                        : isActive
                          ? colors.text
                          : 'text-gray-600'
                    }`}
                  >
                    {step.service}
                  </span>
                </div>
                {(isActive || isCompleted || isBlocked) && (
                  <p
                    className={`text-base mt-0.5 transition-colors duration-300 ${
                      isBlocked
                        ? 'text-red-300/80 font-semibold'
                        : isActive
                          ? 'text-gray-300'
                          : 'text-gray-500'
                    }`}
                  >
                    {isBlocked && currentRun?.catchReason
                      ? currentRun.catchReason
                      : step.desc}
                  </p>
                )}
                {isActive && (
                  <code
                    className={`text-sm ${colors.text} mt-0.5 block font-mono font-bold`}
                  >
                    {step.action}
                  </code>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Confidential compute badge */}
      <div className="mt-3 pt-3 border-t border-gray-800">
        <div className="flex items-center gap-3 text-base text-orange-400/70 font-medium">
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
              clipRule="evenodd"
            />
          </svg>
          <span>
            Confidential HTTP hides API keys + risk thresholds from DON nodes
          </span>
        </div>
      </div>
    </div>
  )
}
