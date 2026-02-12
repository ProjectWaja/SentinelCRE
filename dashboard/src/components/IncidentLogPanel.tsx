'use client'

import { useState, useEffect } from 'react'
import type { AgentData } from '@/hooks/useSentinelData'

interface IncidentData {
  timestamp: number
  agentId: string
  incidentType: number
  incidentLabel: string
  reason: string
  targetContract: string
  attemptedValue: string
}

const TYPE_STYLES: Record<string, string> = {
  PolicyViolation: 'text-red-400 bg-red-400/10',
  ConsensusFailure: 'text-orange-400 bg-orange-400/10',
  RateLimit: 'text-yellow-400 bg-yellow-400/10',
  AnomalyDetected: 'text-purple-400 bg-purple-400/10',
  ManualFreeze: 'text-blue-400 bg-blue-400/10',
}

export default function IncidentLogPanel({
  agents,
}: {
  agents: AgentData[]
}) {
  const [incidents, setIncidents] = useState<IncidentData[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadIncidents() {
      const agentsWithIncidents = agents.filter((a) => a.incidentCount > 0)
      if (agentsWithIncidents.length === 0) {
        setIncidents([])
        setLoading(false)
        return
      }

      const results = await Promise.all(
        agentsWithIncidents.map((a) =>
          fetch(`/api/incidents?agentId=${a.agentId}`)
            .then((r) => r.json())
            .then((d) => d.incidents as IncidentData[])
            .catch(() => [] as IncidentData[]),
        ),
      )

      const all = results
        .flat()
        .sort((a, b) => b.timestamp - a.timestamp)
      setIncidents(all)
      setLoading(false)
    }

    loadIncidents()
  }, [agents])

  return (
    <div className="bg-gray-900 rounded-xl border border-red-900/30 p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-white">Incident Log</h2>
        <span className="text-xs text-gray-500 bg-gray-800 px-2.5 py-1 rounded-full">
          {incidents.length} incidents
        </span>
      </div>

      {loading ? (
        <p className="text-sm text-gray-500">Loading incidents...</p>
      ) : incidents.length === 0 ? (
        <p className="text-sm text-gray-500">
          No incidents recorded — all agents operating within policy
        </p>
      ) : (
        <div className="space-y-3 max-h-80 overflow-y-auto">
          {incidents.map((inc, i) => (
            <div
              key={`${inc.agentId}-${inc.timestamp}-${i}`}
              className="bg-gray-800/50 rounded-lg p-3 border border-gray-700/50 animate-slide-in"
            >
              <div className="flex items-center justify-between mb-1">
                <span
                  className={`text-xs px-2 py-0.5 rounded-full ${TYPE_STYLES[inc.incidentLabel] ?? 'text-gray-400 bg-gray-400/10'}`}
                >
                  {inc.incidentLabel}
                </span>
                <span className="text-xs text-gray-600">
                  {inc.timestamp > 0
                    ? new Date(inc.timestamp * 1000).toLocaleString()
                    : 'N/A'}
                </span>
              </div>
              <p className="text-sm text-gray-300">{inc.reason}</p>
              <p className="text-xs text-gray-600 font-mono mt-1">
                Target: {inc.targetContract.slice(0, 10)}...
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
