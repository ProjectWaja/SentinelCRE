'use client'

import type { DemoButton } from '@/lib/demo-scenarios'
import { DEMO_AGENTS } from '@/lib/demo-scenarios'
import { formatEther } from 'viem'

function agentName(agentId: string): string {
  return DEMO_AGENTS.find((a) => a.id === agentId)?.name ?? 'Unknown'
}

function formatValue(wei: string): string {
  try {
    const eth = formatEther(BigInt(wei))
    return `${eth} ETH`
  } catch {
    return wei
  }
}

function formatMint(raw: string): string {
  try {
    const n = Number(BigInt(raw)) / 1e18
    if (n === 0) return ''
    return `${n.toLocaleString()} tokens`
  } catch {
    return ''
  }
}

export type SimPhase = 'idle' | 'drag-active' | 'drag-over' | 'simulating' | 'done' | 'error'

export interface DragPayload {
  buttonIndex: number
  variant: 'safe' | 'attack'
  label: string
}

export default function DraggableScenarioCard({
  btn,
  index,
  phase,
  isActive,
  result,
  onDragStart,
  onDragEnd,
  onClick,
}: {
  btn: DemoButton
  index: number
  phase: SimPhase
  isActive: boolean
  result?: { success: boolean } | null
  onDragStart: (payload: DragPayload) => void
  onDragEnd: () => void
  onClick: () => void
}) {
  const isAttack = btn.variant === 'attack'
  const disabled = phase === 'simulating'
  const isSimulating = isActive && phase === 'simulating'
  const isDone = isActive && phase === 'done'

  const value = btn.proposal.value !== '0' ? formatValue(btn.proposal.value) : ''
  const mint = formatMint(btn.proposal.mintAmount)
  const displayValue = mint || value || 'N/A'

  return (
    <div
      draggable={!disabled}
      onDragStart={(e) => {
        const payload: DragPayload = { buttonIndex: index, variant: btn.variant, label: btn.label }
        e.dataTransfer.setData('application/json', JSON.stringify(payload))
        e.dataTransfer.effectAllowed = 'move'
        onDragStart(payload)
      }}
      onDragEnd={() => onDragEnd()}
      onClick={() => !disabled && onClick()}
      className={`relative p-4 rounded-xl border transition-all select-none ${
        disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-grab active:cursor-grabbing'
      } ${
        isSimulating
          ? 'bg-blue-500/20 border-blue-500/50 animate-pulse'
          : isDone
            ? result?.success
              ? 'bg-green-500/20 border-green-500/50'
              : 'bg-red-500/20 border-red-500/50'
            : isAttack
              ? 'bg-gray-800/50 border-red-900/30 hover:border-red-500/50 hover:bg-red-500/5'
              : 'bg-gray-800/50 border-green-900/30 hover:border-green-500/50 hover:bg-green-500/5'
      }`}
    >
      <div className="flex items-center justify-between mb-1.5">
        <span className={`text-base font-bold ${isAttack ? 'text-red-400' : 'text-green-400'}`}>
          {isSimulating ? 'Simulating...' : btn.label}
        </span>
        {isSimulating && (
          <span className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
        )}
        {isDone && (
          <span className={`text-sm font-bold ${result?.success ? 'text-green-400' : 'text-red-400'}`}>
            {result?.success ? 'SUCCESS' : 'REVERTED'}
          </span>
        )}
      </div>
      <p className="text-sm text-gray-400 mb-2">{btn.description}</p>
      <div className="flex items-center gap-3 text-sm">
        <span className="text-gray-500">
          {agentName(btn.proposal.agentId)}
        </span>
        <span className={`font-mono px-2 py-0.5 rounded ${
          isAttack ? 'bg-red-500/10 text-red-400' : 'bg-green-500/10 text-green-400'
        }`}>
          {displayValue}
        </span>
      </div>
    </div>
  )
}
