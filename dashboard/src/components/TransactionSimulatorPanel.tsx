'use client'

import { useState, useCallback } from 'react'
import { DEMO_BUTTONS } from '@/lib/demo-scenarios'
import ScenarioCardDeck from './simulator/ScenarioCardDeck'
import WalletDropZone from './simulator/WalletDropZone'
import SimulationResultsOverlay from './simulator/SimulationResultsOverlay'
import CustomTransactionForm from './simulator/CustomTransactionForm'
import type { SimPhase, DragPayload } from './simulator/DraggableScenarioCard'

interface SimulationResponse {
  success: boolean
  gasUsed: number
  revertReason?: string
  stateChanges: Array<{ address: string; key: string; before: string; after: string }>
  balanceChanges: Array<{ address: string; before: string; after: string; diff: string }>
  callTrace: any
  logs: Array<{ address: string; decoded?: { name: string; args: Record<string, string> } }>
  error?: string
}

export default function TransactionSimulatorPanel() {
  const [phase, setPhase] = useState<SimPhase>('idle')
  const [dragVariant, setDragVariant] = useState<'safe' | 'attack' | null>(null)
  const [activeIndex, setActiveIndex] = useState<number | null>(null)
  const [activeLabel, setActiveLabel] = useState<string | null>(null)
  const [result, setResult] = useState<SimulationResponse | null>(null)
  const [error, setError] = useState<string | null>(null)

  const simulateScenario = useCallback(async (index: number) => {
    const btn = DEMO_BUTTONS[index]
    setActiveIndex(index)
    setActiveLabel(btn.label)
    setDragVariant(btn.variant)
    setPhase('simulating')
    setResult(null)
    setError(null)

    try {
      const res = await fetch('/api/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'proposal', proposal: btn.proposal }),
      })
      const data = await res.json()
      if (data.error) {
        setError(data.error)
        setPhase('error')
      } else {
        setResult(data)
        setPhase('done')
      }
    } catch (err: any) {
      setError(err.message)
      setPhase('error')
    }
  }, [])

  const simulateCustom = useCallback(async (to: string, input: string, value: string) => {
    setActiveIndex(null)
    setActiveLabel('Custom Transaction')
    setDragVariant(null)
    setPhase('simulating')
    setResult(null)
    setError(null)

    try {
      const res = await fetch('/api/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'custom',
          custom: { to, input: input || '0x', value: value || '0' },
        }),
      })
      const data = await res.json()
      if (data.error) {
        setError(data.error)
        setPhase('error')
      } else {
        setResult(data)
        setPhase('done')
      }
    } catch (err: any) {
      setError(err.message)
      setPhase('error')
    }
  }, [])

  const handleDragStart = useCallback((payload: DragPayload) => {
    setDragVariant(payload.variant)
    setPhase('drag-active')
    // Clear previous result when starting a new drag
    setResult(null)
    setError(null)
  }, [])

  const handleDragEnd = useCallback(() => {
    // Only reset if we haven't started simulating
    setPhase((prev) => prev === 'drag-active' || prev === 'drag-over' ? 'idle' : prev)
    if (phase === 'drag-active' || phase === 'drag-over') {
      setDragVariant(null)
    }
  }, [phase])

  const handleDragEnter = useCallback(() => {
    setPhase('drag-over')
  }, [])

  const handleDragLeave = useCallback(() => {
    setPhase('drag-active')
  }, [])

  const handleDrop = useCallback((payload: DragPayload) => {
    simulateScenario(payload.buttonIndex)
  }, [simulateScenario])

  const handleReset = useCallback(() => {
    setPhase('idle')
    setResult(null)
    setError(null)
    setActiveIndex(null)
    setActiveLabel(null)
    setDragVariant(null)
  }, [])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-white">Transaction Simulator</h2>
          <p className="text-base text-gray-500 mt-1">
            Drag an attack onto the wallet to simulate via Tenderly
          </p>
        </div>
        {(phase === 'done' || phase === 'error') && (
          <button
            onClick={handleReset}
            className="px-5 py-2.5 bg-gray-800 hover:bg-gray-700 text-base text-gray-300 font-semibold rounded-xl border border-gray-700 transition-colors"
          >
            Reset
          </button>
        )}
      </div>

      {/* Main DnD layout */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        {/* Left: Draggable scenario cards */}
        <div className="xl:col-span-7">
          <ScenarioCardDeck
            phase={phase}
            activeIndex={activeIndex}
            result={result}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            onClickSimulate={simulateScenario}
          />
        </div>

        {/* Right: Wallet drop zone */}
        <div className="xl:col-span-5">
          <div className="xl:sticky xl:top-24">
            <WalletDropZone
              phase={phase}
              dragVariant={dragVariant}
              activeLabel={activeLabel}
              result={result}
              error={error}
              onDragEnter={handleDragEnter}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            />
          </div>
        </div>
      </div>

      {/* Results overlay (full width) */}
      {phase === 'done' && result && (
        <SimulationResultsOverlay
          result={result}
          scenarioLabel={activeLabel}
          variant={dragVariant}
        />
      )}

      {/* Custom transaction form (collapsed) */}
      <CustomTransactionForm
        disabled={phase === 'simulating'}
        onSimulate={simulateCustom}
      />
    </div>
  )
}
