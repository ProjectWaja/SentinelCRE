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

export default function HomeClient() {
  const [activeTab, setActiveTab] = useState('architecture')
  const [tabKey, setTabKey] = useState(0)
  const { data } = useSentinelData()
  const { verdicts, addVerdict, clearVerdicts } = useVerdictHistory()
  const [currentRun, setCurrentRun] = useState<PipelineRun | null>(null)

  const runIdRef = useRef<string>('')

  const handleTabChange = useCallback((tab: string) => {
    if (tab === activeTab) return
    setActiveTab(tab)
    setTabKey((k) => k + 1)
    // Scroll content area to top on tab switch
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [activeTab])

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
      {/* Hero header */}
      <div className="w-full px-6 xl:px-10 py-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="flex items-center gap-4 mb-1">
              <h1 className="text-4xl font-black text-white">
                SentinelCRE
              </h1>
              <span className="text-base font-bold text-blue-400 bg-blue-400/10 px-4 py-1.5 rounded-full border border-blue-400/30">
                Built on Chainlink CRE
              </span>
            </div>
            <p className="text-xl text-gray-400 mt-1">
              Decentralized AI guardian that blocks autonomous agent exploits before they execute &mdash; 3-layer defense, dual-AI consensus, 7-dimension behavioral scoring
            </p>
          </div>
          <div className="flex items-center gap-4 shrink-0">
            <span
              className={`flex items-center gap-2.5 text-base px-4 py-2 rounded-full font-semibold transition-colors duration-300 ${
                data.apiHealthy
                  ? 'text-green-400 bg-green-400/10'
                  : 'text-red-400 bg-red-400/10'
              }`}
            >
              <span
                className={`w-3 h-3 rounded-full transition-colors duration-300 ${
                  data.apiHealthy
                    ? 'bg-green-400 animate-pulse'
                    : 'bg-red-400'
                }`}
              />
              {data.apiHealthy ? 'API Online' : 'API Offline'}
            </span>
            <span
              className={`text-base px-4 py-2 rounded-full font-semibold transition-colors duration-300 ${
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

      <TabNavigation activeTab={activeTab} onTabChange={handleTabChange} />

      {/* Demo tab uses near-fullscreen layout for video readability */}
      <div
        key={`demo-${tabKey}`}
        className={activeTab === 'demo' ? 'tab-panel-enter' : 'hidden'}
      >
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
        <div
          key={`guardian-${tabKey}`}
          className={activeTab === 'guardian' ? 'tab-panel-enter' : 'hidden'}
        >
          <GuardianTab sessionVerdicts={verdicts} />
        </div>

        <div
          key={`simulator-${tabKey}`}
          className={activeTab === 'simulator' ? 'tab-panel-enter' : 'hidden'}
        >
          <BehavioralTrainingPanel />
        </div>

        <div
          key={`architecture-${tabKey}`}
          className={activeTab === 'architecture' ? 'tab-panel-enter' : 'hidden'}
        >
          <ArchitecturePanel />
        </div>
      </div>
    </div>
  )
}
