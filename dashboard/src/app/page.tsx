'use client'

import { useState } from 'react'
import { useSentinelData } from '@/hooks/useSentinelData'
import { useVerdictHistory } from '@/hooks/useVerdictHistory'
import TabNavigation from '@/components/TabNavigation'
import StatsOverview from '@/components/StatsOverview'
import AgentRegistryPanel from '@/components/AgentRegistryPanel'
import IncidentLogPanel from '@/components/IncidentLogPanel'
import DemoControlPanel from '@/components/DemoControlPanel'
import VerdictFeedPanel from '@/components/VerdictFeedPanel'
import ArchitecturePanel from '@/components/ArchitecturePanel'

export default function Home() {
  const [activeTab, setActiveTab] = useState('guardian')
  const { data } = useSentinelData()
  const { verdicts, addVerdict, clearVerdicts } = useVerdictHistory()

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
          <div className="space-y-6">
            <DemoControlPanel onVerdictReceived={addVerdict} />
            <VerdictFeedPanel verdicts={verdicts} onClear={clearVerdicts} />
          </div>
        </div>

        <div className={activeTab === 'architecture' ? '' : 'hidden'}>
          <ArchitecturePanel />
        </div>
      </div>
    </div>
  )
}
