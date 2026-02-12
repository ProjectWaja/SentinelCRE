'use client'

import { useState, useEffect, useRef } from 'react'

export interface PipelineRun {
  id: string
  description: string
  consensus: 'APPROVED' | 'DENIED' | null
  startedAt: number
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
    service: 'HTTPClient',
    action: 'sendRequest()',
    label: 'AI Model 1',
    desc: 'Call Claude (Model 1) for security evaluation',
    color: 'purple',
    delay: 800,
  },
  {
    service: 'HTTPClient',
    action: 'sendRequest()',
    label: 'AI Model 2',
    desc: 'Call secondary model for independent evaluation',
    color: 'purple',
    delay: 1000,
  },
  {
    service: 'ConsensusAggregation',
    action: 'identical(verdict)',
    label: 'DON Consensus',
    desc: 'BFT consensus — all DON nodes must agree on verdict',
    color: 'yellow',
    delay: 1400,
  },
  {
    service: 'EVMClient',
    action: 'writeReport()',
    label: 'Write Verdict',
    desc: 'Submit signed verdict report to SentinelGuardian',
    color: 'green',
    delay: 1800,
  },
  {
    service: 'SentinelGuardian',
    action: 'processVerdict()',
    label: 'On-Chain Policy',
    desc: 'PolicyLib.checkAll() — value, target, function, rate, mint',
    color: 'red',
    delay: 2200,
  },
]

const COLOR_MAP: Record<string, { dot: string; text: string; bg: string; border: string; glow: string }> = {
  blue: { dot: 'bg-blue-400', text: 'text-blue-400', bg: 'bg-blue-400/10', border: 'border-blue-400/30', glow: 'shadow-blue-400/20' },
  cyan: { dot: 'bg-cyan-400', text: 'text-cyan-400', bg: 'bg-cyan-400/10', border: 'border-cyan-400/30', glow: 'shadow-cyan-400/20' },
  purple: { dot: 'bg-purple-400', text: 'text-purple-400', bg: 'bg-purple-400/10', border: 'border-purple-400/30', glow: 'shadow-purple-400/20' },
  yellow: { dot: 'bg-yellow-400', text: 'text-yellow-400', bg: 'bg-yellow-400/10', border: 'border-yellow-400/30', glow: 'shadow-yellow-400/20' },
  green: { dot: 'bg-green-400', text: 'text-green-400', bg: 'bg-green-400/10', border: 'border-green-400/30', glow: 'shadow-green-400/20' },
  red: { dot: 'bg-red-400', text: 'text-red-400', bg: 'bg-red-400/10', border: 'border-red-400/30', glow: 'shadow-red-400/20' },
}

export default function ChainlinkActivityPanel({
  currentRun,
}: {
  currentRun: PipelineRun | null
}) {
  const [activeStep, setActiveStep] = useState(-1)
  const [completedSteps, setCompletedSteps] = useState<number[]>([])
  const prevRunId = useRef<string | null>(null)

  useEffect(() => {
    if (!currentRun || currentRun.id === prevRunId.current) return
    prevRunId.current = currentRun.id

    // Reset
    setActiveStep(-1)
    setCompletedSteps([])

    // Animate through steps
    PIPELINE_STEPS.forEach((step, i) => {
      setTimeout(() => {
        setActiveStep(i)
        setCompletedSteps((prev) => [...prev.filter((s) => s < i)])
      }, step.delay)

      // Mark as completed after brief highlight
      setTimeout(() => {
        setCompletedSteps((prev) => [...prev, i])
        if (i === PIPELINE_STEPS.length - 1) {
          // Final step — keep it active briefly then mark done
          setTimeout(() => setActiveStep(-1), 600)
        }
      }, step.delay + 350)
    })
  }, [currentRun])

  const isIdle = !currentRun || activeStep === -1

  return (
    <div className="bg-gray-900 rounded-xl border border-gray-800 p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-white uppercase tracking-wider">
          Chainlink Pipeline
        </h2>
        {!isIdle && (
          <span className="flex items-center gap-1.5 text-xs text-yellow-400 bg-yellow-400/10 px-2 py-0.5 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 animate-pulse" />
            Processing
          </span>
        )}
        {isIdle && currentRun?.consensus && (
          <span
            className={`text-xs px-2 py-0.5 rounded-full ${
              currentRun.consensus === 'APPROVED'
                ? 'text-green-400 bg-green-400/10'
                : 'text-red-400 bg-red-400/10'
            }`}
          >
            {currentRun.consensus}
          </span>
        )}
      </div>

      <div className="space-y-1">
        {PIPELINE_STEPS.map((step, i) => {
          const colors = COLOR_MAP[step.color]
          const isActive = activeStep === i
          const isCompleted = completedSteps.includes(i)
          const isPending = !isActive && !isCompleted

          return (
            <div
              key={i}
              className={`flex items-start gap-3 rounded-lg p-2.5 transition-all duration-300 ${
                isActive
                  ? `${colors.bg} border ${colors.border} shadow-lg ${colors.glow}`
                  : isCompleted
                    ? 'bg-gray-800/30 border border-transparent'
                    : 'bg-transparent border border-transparent opacity-40'
              }`}
            >
              {/* Step indicator */}
              <div className="flex flex-col items-center mt-0.5">
                <div
                  className={`w-3 h-3 rounded-full transition-all duration-300 ${
                    isActive
                      ? `${colors.dot} animate-pulse scale-125`
                      : isCompleted
                        ? 'bg-gray-600'
                        : 'bg-gray-800 border border-gray-700'
                  }`}
                />
                {i < PIPELINE_STEPS.length - 1 && (
                  <div
                    className={`w-0.5 h-4 mt-0.5 transition-colors duration-300 ${
                      isCompleted ? 'bg-gray-700' : 'bg-gray-800'
                    }`}
                  />
                )}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span
                    className={`text-xs font-semibold transition-colors duration-300 ${
                      isActive
                        ? colors.text
                        : isCompleted
                          ? 'text-gray-400'
                          : 'text-gray-600'
                    }`}
                  >
                    {step.label}
                  </span>
                  <span
                    className={`font-mono text-[10px] transition-colors duration-300 ${
                      isActive ? colors.text : 'text-gray-700'
                    }`}
                  >
                    {step.service}
                  </span>
                </div>
                {(isActive || isCompleted) && (
                  <p
                    className={`text-[11px] mt-0.5 transition-colors duration-300 ${
                      isActive ? 'text-gray-300' : 'text-gray-600'
                    }`}
                  >
                    {isPending ? '' : step.desc}
                  </p>
                )}
                {isActive && (
                  <code
                    className={`text-[10px] ${colors.text} mt-0.5 block font-mono`}
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
        <div className="flex items-center gap-2 text-[11px] text-orange-400/60">
          <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
              clipRule="evenodd"
            />
          </svg>
          <span>
            Confidential HTTP hides API keys from DON nodes
          </span>
        </div>
      </div>
    </div>
  )
}
