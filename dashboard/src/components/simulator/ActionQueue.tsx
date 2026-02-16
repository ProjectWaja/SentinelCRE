'use client'

import { useState, useCallback, useRef } from 'react'

export interface ActionItem {
  title: string
  description: string
  isSafe: boolean
  status: 'pending' | 'running' | 'done'
  scoreBefore?: number
  scoreAfter?: number
  verdict?: 'APPROVED' | 'DENIED'
}

interface ActionQueueProps {
  actions: ActionItem[]
  onRunAction: (index: number) => Promise<void>
  currentIndex: number
}

function ScoreDelta({ before, after }: { before: number; after: number }) {
  const delta = after - before
  if (delta === 0) {
    return (
      <span className="text-green-400 font-mono text-sm font-bold">+0</span>
    )
  }
  const color =
    delta >= 20
      ? 'text-red-400'
      : delta >= 10
        ? 'text-orange-400'
        : delta >= 5
          ? 'text-yellow-400'
          : 'text-green-400'
  return (
    <span className={`${color} font-mono text-sm font-bold`}>+{delta}</span>
  )
}

function StatusIcon({ status, isSafe, verdict }: { status: ActionItem['status']; isSafe: boolean; verdict?: 'APPROVED' | 'DENIED' }) {
  if (status === 'running') {
    return (
      <div className="w-6 h-6 flex items-center justify-center">
        <span className="w-5 h-5 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (status === 'done') {
    if (isSafe || verdict === 'APPROVED') {
      // Green check
      return (
        <div className="w-6 h-6 rounded-full bg-green-500/20 flex items-center justify-center">
          <svg className="w-4 h-4 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
      )
    }
    // Red X for denied attacks
    return (
      <div className="w-6 h-6 rounded-full bg-red-500/20 flex items-center justify-center">
        <svg className="w-4 h-4 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </div>
    )
  }

  // Pending — numbered circle
  return (
    <div className="w-6 h-6 rounded-full border-2 border-gray-600 flex items-center justify-center">
      <span className="text-xs text-gray-500 font-bold" />
    </div>
  )
}

export default function ActionQueue({
  actions,
  onRunAction,
  currentIndex,
}: ActionQueueProps) {
  const [isRunningAll, setIsRunningAll] = useState(false)
  const cancelRef = useRef(false)

  const nextPending = actions.findIndex((a) => a.status === 'pending')
  const allDone = actions.every((a) => a.status === 'done')
  const isRunning = actions.some((a) => a.status === 'running')

  const handleRunNext = useCallback(async () => {
    if (nextPending === -1 || isRunning) return
    await onRunAction(nextPending)
  }, [nextPending, isRunning, onRunAction])

  const handleRunAll = useCallback(async () => {
    if (isRunningAll || isRunning) return
    cancelRef.current = false
    setIsRunningAll(true)

    for (let i = 0; i < actions.length; i++) {
      if (cancelRef.current) break
      if (actions[i].status !== 'pending') continue
      await onRunAction(i)
      // 1.5s delay between actions (unless cancelled or last action)
      if (!cancelRef.current && i < actions.length - 1) {
        await new Promise((r) => setTimeout(r, 1500))
      }
    }

    setIsRunningAll(false)
  }, [actions, isRunningAll, isRunning, onRunAction])

  const handleStop = useCallback(() => {
    cancelRef.current = true
  }, [])

  return (
    <div className="rounded-2xl border border-gray-700/50 bg-gray-900/80 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800/50">
        <div>
          <h3 className="text-lg font-bold text-gray-300">Action Queue</h3>
          <p className="text-sm text-gray-500 mt-0.5">
            {allDone
              ? 'All actions completed'
              : `${actions.filter((a) => a.status === 'done').length} of ${actions.length} completed`}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {!allDone && !isRunningAll && (
            <>
              <button
                onClick={handleRunNext}
                disabled={isRunning || nextPending === -1}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:text-gray-500 text-white text-sm font-bold rounded-xl transition-colors"
              >
                Run Next
              </button>
              <button
                onClick={handleRunAll}
                disabled={isRunning || nextPending === -1}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-500 disabled:bg-gray-700 disabled:text-gray-500 text-white text-sm font-bold rounded-xl transition-colors"
              >
                Run All
              </button>
            </>
          )}
          {isRunningAll && (
            <button
              onClick={handleStop}
              className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white text-sm font-bold rounded-xl transition-colors"
            >
              Stop
            </button>
          )}
        </div>
      </div>

      {/* Empty state */}
      {actions.length === 0 && (
        <div className="px-6 py-12 text-center">
          <p className="text-gray-500 text-base">No actions queued. Select an agent to begin.</p>
        </div>
      )}

      {/* Action list */}
      <div className="divide-y divide-gray-800/30">
        {actions.map((action, index) => {
          const isCurrentlyRunning = action.status === 'running'
          const isDone = action.status === 'done'
          const isPending = action.status === 'pending'
          const isNext = index === nextPending && !isRunning

          return (
            <div
              key={`${action.title}-${index}`}
              className={`px-6 py-4 transition-all duration-300 ${
                isCurrentlyRunning
                  ? 'bg-blue-500/5 border-l-4 border-l-blue-500'
                  : isDone
                    ? action.isSafe
                      ? 'bg-green-500/3'
                      : 'bg-red-500/3'
                    : isNext
                      ? 'bg-gray-800/30 border-l-4 border-l-gray-500'
                      : ''
              }`}
            >
              <div className="flex items-start gap-4">
                {/* Index + Status Icon */}
                <div className="flex items-center gap-2 pt-0.5 shrink-0">
                  <span className="text-xs text-gray-600 font-mono w-5 text-right">
                    {index + 1}.
                  </span>
                  <StatusIcon
                    status={action.status}
                    isSafe={action.isSafe}
                    verdict={action.verdict}
                  />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span
                      className={`text-base font-bold ${
                        isCurrentlyRunning
                          ? 'text-blue-300'
                          : isDone
                            ? 'text-gray-300'
                            : isPending
                              ? 'text-gray-400'
                              : 'text-gray-300'
                      }`}
                    >
                      {action.title}
                    </span>
                    {action.isSafe ? (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/10 text-green-400 font-semibold">
                        SAFE
                      </span>
                    ) : (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-red-500/10 text-red-400 font-semibold">
                        ATTACK
                      </span>
                    )}
                    {isCurrentlyRunning && (
                      <span className="text-xs text-blue-400 font-semibold animate-pulse">
                        Evaluating...
                      </span>
                    )}
                  </div>
                  <p
                    className={`text-sm ${
                      isDone ? 'text-gray-500' : 'text-gray-400'
                    } truncate`}
                  >
                    {action.description}
                  </p>
                </div>

                {/* Score delta and verdict (right side) */}
                <div className="flex items-center gap-3 shrink-0 pt-0.5">
                  {isDone && action.scoreBefore !== undefined && action.scoreAfter !== undefined && (
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-gray-500 font-mono">
                        {action.scoreBefore}
                      </span>
                      <svg className="w-3 h-3 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                      </svg>
                      <span
                        className={`font-mono font-bold ${
                          action.scoreAfter >= 70
                            ? 'text-red-400'
                            : action.scoreAfter >= 50
                              ? 'text-orange-400'
                              : 'text-gray-300'
                        }`}
                      >
                        {action.scoreAfter}
                      </span>
                      <span className="text-gray-600 mx-0.5">|</span>
                      <ScoreDelta before={action.scoreBefore} after={action.scoreAfter} />
                    </div>
                  )}
                  {isDone && action.verdict && (
                    <span
                      className={`text-xs font-bold px-2.5 py-1 rounded-lg ${
                        action.verdict === 'APPROVED'
                          ? 'bg-green-500/10 text-green-400'
                          : 'bg-red-500/10 text-red-400'
                      }`}
                    >
                      {action.verdict}
                    </span>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
