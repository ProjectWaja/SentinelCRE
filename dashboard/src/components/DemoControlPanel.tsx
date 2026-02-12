'use client'

import { useState } from 'react'
import { DEMO_BUTTONS, type VerdictResult } from '@/lib/demo-scenarios'
import { evaluateAction } from '@/lib/mock-api'

type ButtonStatus = 'idle' | 'loading' | 'success' | 'error'

const CATEGORIES = [
  { key: 'safe', label: 'Safe Operations', color: 'green' },
  { key: 'common', label: 'Common Attacks', color: 'red' },
  { key: 'advanced', label: 'Advanced Attacks', color: 'orange' },
] as const

export default function DemoControlPanel({
  onVerdictReceived,
  onPipelineStart,
  onPipelineComplete,
}: {
  onVerdictReceived: (v: VerdictResult) => void
  onPipelineStart?: (description: string) => void
  onPipelineComplete?: (consensus: 'APPROVED' | 'DENIED') => void
}) {
  const [statuses, setStatuses] = useState<Record<number, ButtonStatus>>({})
  const [runningAll, setRunningAll] = useState(false)

  async function runScenario(index: number) {
    const btn = DEMO_BUTTONS[index]
    setStatuses((s) => ({ ...s, [index]: 'loading' }))
    onPipelineStart?.(btn.label)
    try {
      const result = await evaluateAction(btn.proposal)
      onVerdictReceived(result)
      onPipelineComplete?.(result.consensus === 'APPROVED' ? 'APPROVED' : 'DENIED')
      setStatuses((s) => ({ ...s, [index]: 'success' }))
      setTimeout(() => setStatuses((s) => ({ ...s, [index]: 'idle' })), 2000)
    } catch {
      onPipelineComplete?.('DENIED')
      setStatuses((s) => ({ ...s, [index]: 'error' }))
      setTimeout(() => setStatuses((s) => ({ ...s, [index]: 'idle' })), 2000)
    }
  }

  async function runAllAttacks() {
    setRunningAll(true)
    for (let i = 0; i < DEMO_BUTTONS.length; i++) {
      if (DEMO_BUTTONS[i].variant === 'attack') {
        await runScenario(i)
        await new Promise((r) => setTimeout(r, 500))
      }
    }
    setRunningAll(false)
  }

  return (
    <div className="bg-gray-900 rounded-xl border border-gray-800 p-6">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-lg font-semibold text-white">Demo Scenarios</h2>
        <button
          onClick={runAllAttacks}
          disabled={runningAll}
          className="text-xs bg-red-600 hover:bg-red-700 disabled:bg-gray-700 text-white px-3 py-1.5 rounded-lg transition-colors"
        >
          {runningAll ? 'Running...' : 'Run All Attacks'}
        </button>
      </div>

      <div className="space-y-5">
        {CATEGORIES.map((cat) => {
          const buttons = DEMO_BUTTONS.map((btn, i) => ({ btn, i })).filter(
            ({ btn }) => btn.category === cat.key,
          )
          if (buttons.length === 0) return null

          return (
            <div key={cat.key}>
              <h3
                className={`text-xs font-semibold uppercase tracking-wider mb-2 ${
                  cat.color === 'green'
                    ? 'text-green-400'
                    : cat.color === 'red'
                      ? 'text-red-400'
                      : 'text-orange-400'
                }`}
              >
                {cat.label}
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {buttons.map(({ btn, i }) => {
                  const status = statuses[i] ?? 'idle'
                  const isAttack = btn.variant === 'attack'
                  return (
                    <button
                      key={i}
                      onClick={() => runScenario(i)}
                      disabled={status === 'loading' || runningAll}
                      className={`text-left p-3 rounded-lg border transition-all ${
                        status === 'success'
                          ? isAttack
                            ? 'bg-red-500/20 border-red-500/50'
                            : 'bg-green-500/20 border-green-500/50'
                          : status === 'loading'
                            ? 'bg-gray-800/50 border-gray-600 opacity-70'
                            : isAttack
                              ? 'bg-gray-800/50 border-red-900/30 hover:border-red-700/50'
                              : 'bg-gray-800/50 border-green-900/30 hover:border-green-700/50'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-0.5">
                        <span
                          className={`text-sm font-medium ${isAttack ? 'text-red-400' : 'text-green-400'}`}
                        >
                          {status === 'loading' ? 'Evaluating...' : btn.label}
                        </span>
                        {status === 'loading' && (
                          <span className="w-3 h-3 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                        )}
                        {status === 'success' && (
                          <span className={`text-xs ${isAttack ? 'text-red-400' : 'text-green-400'}`}>
                            {isAttack ? 'BLOCKED' : 'APPROVED'}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500">{btn.description}</p>
                    </button>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
