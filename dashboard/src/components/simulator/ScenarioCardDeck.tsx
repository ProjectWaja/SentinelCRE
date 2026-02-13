'use client'

import { DEMO_BUTTONS } from '@/lib/demo-scenarios'
import DraggableScenarioCard from './DraggableScenarioCard'
import type { SimPhase, DragPayload } from './DraggableScenarioCard'

interface SimulationResponse {
  success: boolean
  gasUsed: number
}

export default function ScenarioCardDeck({
  phase,
  activeIndex,
  result,
  onDragStart,
  onDragEnd,
  onClickSimulate,
}: {
  phase: SimPhase
  activeIndex: number | null
  result: SimulationResponse | null
  onDragStart: (payload: DragPayload) => void
  onDragEnd: () => void
  onClickSimulate: (index: number) => void
}) {
  const safe = DEMO_BUTTONS.filter((b) => b.category === 'safe')
  const common = DEMO_BUTTONS.filter((b) => b.category === 'common')
  const advanced = DEMO_BUTTONS.filter((b) => b.category === 'advanced')

  const groups = [
    { label: 'Safe Operations', items: safe },
    { label: 'Common Attacks', items: common },
    { label: 'Advanced Attacks', items: advanced },
  ]

  return (
    <div className="space-y-5">
      {groups.map((group) => {
        if (group.items.length === 0) return null
        return (
          <div key={group.label}>
            <h3 className="text-sm font-bold uppercase tracking-wider text-gray-400 mb-3">
              {group.label}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {group.items.map((btn) => {
                const globalIndex = DEMO_BUTTONS.indexOf(btn)
                return (
                  <DraggableScenarioCard
                    key={globalIndex}
                    btn={btn}
                    index={globalIndex}
                    phase={phase}
                    isActive={activeIndex === globalIndex}
                    result={activeIndex === globalIndex ? result : null}
                    onDragStart={onDragStart}
                    onDragEnd={onDragEnd}
                    onClick={() => onClickSimulate(globalIndex)}
                  />
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}
