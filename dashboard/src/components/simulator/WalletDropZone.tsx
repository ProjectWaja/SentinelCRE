'use client'

import { useRef, useCallback } from 'react'
import { ADDRESSES } from '@/lib/contracts'
import type { SimPhase, DragPayload } from './DraggableScenarioCard'

interface SimulationResponse {
  success: boolean
  gasUsed: number
  revertReason?: string
}

const DEPLOYER = '0x23fC03ec91D319e4Aa14e90b6d3664540FDf2446'

export default function WalletDropZone({
  phase,
  dragVariant,
  activeLabel,
  result,
  error,
  onDragEnter,
  onDragLeave,
  onDrop,
}: {
  phase: SimPhase
  dragVariant: 'safe' | 'attack' | null
  activeLabel: string | null
  result: SimulationResponse | null
  error: string | null
  onDragEnter: () => void
  onDragLeave: () => void
  onDrop: (payload: DragPayload) => void
}) {
  const enterCount = useRef(0)

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    enterCount.current++
    if (enterCount.current === 1) onDragEnter()
  }, [onDragEnter])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    enterCount.current--
    if (enterCount.current === 0) onDragLeave()
  }, [onDragLeave])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    enterCount.current = 0
    try {
      const data: DragPayload = JSON.parse(e.dataTransfer.getData('application/json'))
      onDrop(data)
    } catch { /* ignore bad data */ }
  }, [onDrop])

  const addr = ADDRESSES.sentinelGuardian
  const shortAddr = `${addr.slice(0, 6)}...${addr.slice(-4)}`
  const shortDeployer = `${DEPLOYER.slice(0, 6)}...${DEPLOYER.slice(-4)}`

  // Visual state
  const isOver = phase === 'drag-over'
  const isDragging = phase === 'drag-active'
  const isSimulating = phase === 'simulating'
  const isDone = phase === 'done'
  const isError = phase === 'error'

  let borderClass = 'border-2 border-dashed border-gray-700'
  let bgClass = 'bg-gray-900'
  let glowClass = ''

  if (isDragging) {
    borderClass = 'border-2 border-dashed border-gray-500'
  } else if (isOver && dragVariant === 'attack') {
    borderClass = 'border-2 border-solid border-red-500'
    bgClass = 'bg-red-500/10'
    glowClass = 'animate-drop-glow-attack'
  } else if (isOver && dragVariant === 'safe') {
    borderClass = 'border-2 border-solid border-green-500'
    bgClass = 'bg-green-500/10'
    glowClass = 'animate-drop-glow-safe'
  } else if (isOver) {
    borderClass = 'border-2 border-solid border-blue-500'
    bgClass = 'bg-blue-500/10'
    glowClass = 'animate-drop-glow'
  } else if (isSimulating) {
    borderClass = 'border-2 border-solid border-yellow-500'
    bgClass = 'bg-yellow-500/5'
  } else if (isDone && result) {
    borderClass = result.success
      ? 'border-2 border-solid border-green-500'
      : 'border-2 border-solid border-red-500'
    bgClass = result.success ? 'bg-green-500/10' : 'bg-red-500/10'
  } else if (isError) {
    borderClass = 'border-2 border-solid border-red-500'
    bgClass = 'bg-red-500/10'
  }

  return (
    <div
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      className={`${borderClass} ${bgClass} ${glowClass} rounded-2xl p-8 min-h-[480px] flex flex-col items-center justify-center text-center transition-all duration-200 ${
        isSimulating ? 'pointer-events-none' : ''
      }`}
    >
      {/* Wallet icon */}
      <div className={`text-6xl mb-4 transition-transform duration-200 ${isOver ? 'scale-110' : ''}`}>
        {isSimulating ? (
          <div className="relative w-16 h-16 mx-auto">
            <div className="absolute inset-0 w-16 h-16 border-4 border-yellow-500 border-t-transparent rounded-full animate-spin" />
            <span className="absolute inset-0 flex items-center justify-center text-3xl">&#x1F6E1;</span>
          </div>
        ) : isDone && result ? (
          result.success ? '&#x2705;' : '&#x1F6E1;'
        ) : isError ? (
          '&#x26A0;'
        ) : isOver && dragVariant === 'attack' ? (
          '&#x1F6A8;'
        ) : isOver ? (
          '&#x1F7E2;'
        ) : (
          '&#x1F6E1;'
        )}
      </div>

      {/* Contract info */}
      <h3 className="text-xl font-bold text-white mb-1">SentinelGuardian</h3>
      <p className="text-sm font-mono text-gray-500 mb-3">{shortAddr}</p>

      <div className="flex items-center gap-3 mb-4">
        <span className="text-sm px-3 py-1 rounded-full bg-purple-500/10 text-purple-400 font-semibold">
          Sepolia
        </span>
        <span className="text-sm px-3 py-1 rounded-full bg-blue-500/10 text-blue-400 font-semibold">
          Tenderly
        </span>
      </div>

      <p className="text-sm text-gray-600 mb-6">
        Deployer: <span className="font-mono">{shortDeployer}</span>
      </p>

      {/* State-specific content */}
      {isSimulating && (
        <div className="animate-verdict">
          <p className="text-lg font-bold text-yellow-400 mb-1">Simulating via Tenderly...</p>
          {activeLabel && <p className="text-base text-gray-400">{activeLabel}</p>}
        </div>
      )}

      {isDone && result && (
        <div className="animate-result-slam">
          <p className={`text-3xl font-black mb-2 ${result.success ? 'text-green-400' : 'text-red-400'}`}>
            {result.success ? 'SUCCESS' : 'REVERTED'}
          </p>
          {result.revertReason && (
            <p className="text-sm text-red-300/70 font-mono mb-2">{result.revertReason}</p>
          )}
          <p className="text-base text-gray-400">
            Gas: <span className="font-mono text-white">{result.gasUsed.toLocaleString()}</span>
          </p>
        </div>
      )}

      {isError && error && (
        <div>
          <p className="text-lg font-bold text-red-400 mb-1">Simulation Error</p>
          <p className="text-sm text-red-300/70 font-mono">{error}</p>
        </div>
      )}

      {!isSimulating && !isDone && !isError && (
        <p className={`text-base font-semibold ${
          isOver
            ? dragVariant === 'attack'
              ? 'text-red-400 animate-pulse'
              : 'text-green-400 animate-pulse'
            : isDragging
              ? 'text-gray-400'
              : 'text-gray-600'
        }`}>
          {isOver
            ? 'Release to simulate'
            : isDragging
              ? 'Drop here to simulate'
              : 'Drag a scenario here to simulate'}
        </p>
      )}
    </div>
  )
}
