'use client'

import { useState, useCallback } from 'react'
import { useSentinelData } from '@/hooks/useSentinelData'
import { useVerdictHistory } from '@/hooks/useVerdictHistory'
import TabNavigation from '@/components/TabNavigation'
import StatsOverview from '@/components/StatsOverview'
import AgentRegistryPanel from '@/components/AgentRegistryPanel'
import IncidentLogPanel from '@/components/IncidentLogPanel'
import DemoControlPanel from '@/components/DemoControlPanel'
import VerdictFeedPanel from '@/components/VerdictFeedPanel'
import ArchitecturePanel from '@/components/ArchitecturePanel'
import ChainlinkActivityPanel, { type PipelineRun } from '@/components/ChainlinkActivityPanel'

export default function Home() {
  const [activeTab, setActiveTab] = useState('guardian')
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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white">
              Guardian Dashboard
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Monitor AI agent activity and security incidents
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span
              className={`flex items-center gap-2 text-xs px-2.5 py-1 rounded-full ${
                data.apiHealthy
                  ? 'text-green-400 bg-green-400/10'
                  : 'text-red-400 bg-red-400/10'
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  data.apiHealthy
                    ? 'bg-green-400 animate-pulse'
                    : 'bg-red-400'
                }`}
              />
              {data.apiHealthy ? 'API Online' : 'API Offline'}
            </span>
            <span
              className={`text-xs px-2.5 py-1 rounded-full ${
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

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className={activeTab === 'guardian' ? '' : 'hidden'}>
          <div className="space-y-6">
            <StatsOverview data={data} />
            <AgentRegistryPanel agents={data.agents} />
            <IncidentLogPanel agents={data.agents} />
          </div>
        </div>

        <div className={activeTab === 'demo' ? '' : 'hidden'}>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <DemoControlPanel
                onVerdictReceived={addVerdict}
                onPipelineStart={handlePipelineStart}
                onPipelineComplete={handlePipelineComplete}
              />
              <VerdictFeedPanel verdicts={verdicts} onClear={clearVerdicts} />
            </div>
            <div className="lg:col-span-1">
              <div className="lg:sticky lg:top-6">
                <ChainlinkActivityPanel currentRun={currentRun} />
              </div>
            </div>
          </div>
        </div>

        <div className={activeTab === 'architecture' ? '' : 'hidden'}>
          <ArchitecturePanel />
        </div>
      </div>
    </div>
  )
}
