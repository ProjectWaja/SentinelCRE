'use client'

import { useState, useCallback } from 'react'
import { useSentinelData } from '@/hooks/useSentinelData'
import { useVerdictHistory } from '@/hooks/useVerdictHistory'
import TabNavigation from '@/components/TabNavigation'
import StatsOverview from '@/components/StatsOverview'
import AgentRegistryPanel from '@/components/AgentRegistryPanel'
import IncidentLogPanel from '@/components/IncidentLogPanel'
import ScenarioDemoPanel from '@/components/ScenarioDemoPanel'
import VerdictFeedPanel from '@/components/VerdictFeedPanel'
import ArchitecturePanel from '@/components/ArchitecturePanel'
import ChainlinkActivityPanel, { type PipelineRun } from '@/components/ChainlinkActivityPanel'
import TransactionSimulatorPanel from '@/components/TransactionSimulatorPanel'

export default function Home() {
  const [activeTab, setActiveTab] = useState('demo')
  const { data } = useSentinelData()
  const { verdicts, addVerdict, clearVerdicts } = useVerdictHistory()
  const [currentRun, setCurrentRun] = useState<PipelineRun | null>(null)

  const handlePipelineStart = useCallback((description: string) => {
    setCurrentRun({
      id: crypto.randomUUID(),
      description,
      consensus: null,
      startedAt: Date.now(),
    })
  }, [])

  const handlePipelineComplete = useCallback((consensus: 'APPROVED' | 'DENIED') => {
    setCurrentRun((prev) => prev ? { ...prev, consensus } : null)
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
              />
            </div>
            <div className="xl:col-span-4">
              <div className="xl:sticky xl:top-20 space-y-6">
                <ChainlinkActivityPanel currentRun={currentRun} />
                <VerdictFeedPanel verdicts={verdicts} onClear={clearVerdicts} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Other tabs use full-width layout */}
      <div className="w-full px-6 xl:px-10 py-6">
        <div className={activeTab === 'guardian' ? '' : 'hidden'}>
          <div className="space-y-6">
            <StatsOverview data={data} sessionVerdicts={verdicts} />
            <AgentRegistryPanel agents={data.agents} sessionVerdicts={verdicts} />
            <IncidentLogPanel agents={data.agents} sessionVerdicts={verdicts} />
          </div>
        </div>

        <div className={activeTab === 'simulator' ? '' : 'hidden'}>
          <TransactionSimulatorPanel />
        </div>

        <div className={activeTab === 'architecture' ? '' : 'hidden'}>
          <ArchitecturePanel />
        </div>
      </div>
    </div>
  )
}
