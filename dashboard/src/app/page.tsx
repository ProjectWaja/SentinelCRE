'use client'

import { useState, useCallback, useRef } from 'react'
import { useSentinelData } from '@/hooks/useSentinelData'
import { useVerdictHistory } from '@/hooks/useVerdictHistory'
import TabNavigation from '@/components/TabNavigation'
import ScenarioDemoPanel from '@/components/ScenarioDemoPanel'
import VerdictFeedPanel from '@/components/VerdictFeedPanel'
import ArchitecturePanel from '@/components/ArchitecturePanel'
import ChainlinkActivityPanel, { type PipelineRun } from '@/components/ChainlinkActivityPanel'
import TenderlyFeedPanel from '@/components/TenderlyFeedPanel'
import GuardianTab from '@/components/guardian/GuardianTab'
import BehavioralTrainingPanel from '@/components/simulator/BehavioralTrainingPanel'
import type { VerdictResult } from '@/lib/demo-scenarios'

export default function Home() {
  const [activeTab, setActiveTab] = useState('architecture')
  const { data } = useSentinelData()
  const { verdicts, addVerdict, clearVerdicts } = useVerdictHistory()
  const [currentRun, setCurrentRun] = useState<PipelineRun | null>(null)

  const runIdRef = useRef<string>('')

  const handlePipelineStart = useCallback((description: string) => {
    const id = crypto.randomUUID()
    runIdRef.current = id
    setCurrentRun({
      id,
      description,
      consensus: null,
      startedAt: Date.now(),
    })
  }, [])

  const handlePipelineStep = useCallback((stepIndex: number, totalSteps: number) => {
    setCurrentRun((prev) => {
      if (!prev || prev.consensus) return prev
      return { ...prev, liveStep: stepIndex, totalSteps }
    })
  }, [])

  const handlePipelineComplete = useCallback((result: VerdictResult) => {
    // Determine which pipeline step caught the attack
    // Step 2 = Behavioral Risk Scoring (Layer 2)
    // Step 5 = DON Consensus / AI Models (Layer 3)
    // Step 7 = On-Chain Policy (Layer 1)
    let catchStep: number | undefined
    let catchReason: string | undefined

    if (result.consensus === 'DENIED') {
      if (result.anomalyFlagged) {
        catchStep = 2
        catchReason = `ANOMALY DETECTED — Risk Score ${result.anomalyScore ?? 0}/100 exceeds threshold`
      } else if (result.severity === 'CRITICAL') {
        catchStep = 7
        catchReason = `POLICY VIOLATION — Exceeds on-chain compliance limits`
      } else {
        catchStep = 5
        catchReason = `DENIED — ${result.model1.reason}`
      }
    }

    setCurrentRun({
      id: crypto.randomUUID(),
      description: result.proposal?.description ?? '',
      consensus: result.consensus === 'APPROVED' ? 'APPROVED' : 'DENIED',
      startedAt: Date.now(),
      catchStep,
      catchReason,
    })
  }, [])

  return (
    <div>
      <div className="w-full px-6 xl:px-10 py-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-4xl font-black text-white">
              Guardian Dashboard
            </h1>
            <p className="text-xl text-gray-500 mt-1">
              Monitor AI agent activity and security incidents
            </p>
          </div>
          <div className="flex items-center gap-4">
            <span
              className={`flex items-center gap-2.5 text-base px-4 py-2 rounded-full font-semibold ${
                data.apiHealthy
                  ? 'text-green-400 bg-green-400/10'
                  : 'text-red-400 bg-red-400/10'
              }`}
            >
              <span
                className={`w-3 h-3 rounded-full ${
                  data.apiHealthy
                    ? 'bg-green-400 animate-pulse'
                    : 'bg-red-400'
                }`}
              />
              {data.apiHealthy ? 'API Online' : 'API Offline'}
            </span>
            <span
              className={`text-base px-4 py-2 rounded-full font-semibold ${
                data.isLive
                  ? 'text-blue-400 bg-blue-400/10'
                  : 'text-gray-400 bg-gray-400/10'
              }`}
            >
              {data.isLive ? 'On-Chain' : 'Demo Mode'}
            </span>
          </div>
        </div>
      </div>

      <TabNavigation activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Demo tab uses near-fullscreen layout for video readability */}
      <div className={activeTab === 'demo' ? '' : 'hidden'}>
        <div className="w-full px-6 xl:px-10 py-6">
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
            <div className="xl:col-span-8 space-y-6">
              <ScenarioDemoPanel
                onVerdictReceived={addVerdict}
                onPipelineStart={handlePipelineStart}
                onPipelineComplete={handlePipelineComplete}
                onPipelineStep={handlePipelineStep}
              />
            </div>
            <div className="xl:col-span-4">
              <div className="xl:sticky xl:top-20 xl:max-h-[calc(100vh-6rem)] xl:overflow-y-auto xl:pr-1 space-y-6 scrollbar-thin">
                <ChainlinkActivityPanel currentRun={currentRun} />
                <TenderlyFeedPanel />
                <VerdictFeedPanel verdicts={verdicts} onClear={clearVerdicts} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Other tabs use full-width layout */}
      <div className="w-full px-6 xl:px-10 py-6">
        <div className={activeTab === 'guardian' ? '' : 'hidden'}>
          <GuardianTab sessionVerdicts={verdicts} />
        </div>

        <div className={activeTab === 'simulator' ? '' : 'hidden'}>
          <BehavioralTrainingPanel />
        </div>

        <div className={activeTab === 'architecture' ? '' : 'hidden'}>
          <ArchitecturePanel />
        </div>
      </div>
    </div>
  )
}
