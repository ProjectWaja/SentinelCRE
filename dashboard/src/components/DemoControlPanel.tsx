'use client'

import { useState } from 'react'
import { DEMO_BUTTONS, type VerdictResult } from '@/lib/demo-scenarios'
import { evaluateAction } from '@/lib/mock-api'

type ButtonStatus = 'idle' | 'loading' | 'success' | 'error'

export default function DemoControlPanel({
  onVerdictReceived,
}: {
  onVerdictReceived: (v: VerdictResult) => void
}) {
  const [statuses, setStatuses] = useState<Record<number, ButtonStatus>>({})
  const [runningAll, setRunningAll] = useState(false)

  async function runScenario(index: number) {
    setStatuses((s) => ({ ...s, [index]: 'loading' }))
    try {
      const result = await evaluateAction(DEMO_BUTTONS[index].proposal)
      onVerdictReceived(result)
      setStatuses((s) => ({ ...s, [index]: 'success' }))
      setTimeout(() => setStatuses((s) => ({ ...s, [index]: 'idle' })), 2000)
    } catch {
      setStatuses((s) => ({ ...s, [index]: 'error' }))
      setTimeout(() => setStatuses((s) => ({ ...s, [index]: 'idle' })), 2000)
    }
  }

  async function runAll() {
    setRunningAll(true)
    for (let i = 0; i < DEMO_BUTTONS.length; i++) {
      await runScenario(i)
      await new Promise((r) => setTimeout(r, 500))
    }
    setRunningAll(false)
  }

  return (
    <div className="bg-gray-900 rounded-xl border border-gray-800 p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-white">Demo Scenarios</h2>
        <button
          onClick={runAll}
          disabled={runningAll}
          className="text-xs bg-red-600 hover:bg-red-700 disabled:bg-gray-700 text-white px-3 py-1.5 rounded-lg transition-colors"
        >
          {runningAll ? 'Running...' : 'Run All Attacks'}
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {DEMO_BUTTONS.map((btn, i) => {
          const status = statuses[i] ?? 'idle'
          const isAttack = btn.variant === 'attack'
          return (
            <button
              key={i}
              onClick={() => runScenario(i)}
              disabled={status === 'loading'}
              className={`text-left p-4 rounded-lg border transition-all ${
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
              <div className="flex items-center justify-between mb-1">
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
}
