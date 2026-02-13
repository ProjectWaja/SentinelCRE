'use client'

import type { AgentData } from '@/hooks/useSentinelData'
import type { VerdictEntry } from '@/hooks/useVerdictHistory'
import { useState, useEffect } from 'react'
import { DEMO_AGENTS } from '@/lib/demo-scenarios'

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

function agentName(agentId: string): string {
  const demo = DEMO_AGENTS.find((a) => a.id === agentId)
  return demo?.name ?? `${agentId.slice(0, 10)}...`
}

export default function IncidentLogPanel({
  agents,
  sessionVerdicts = [],
}: {
  agents: AgentData[]
  sessionVerdicts?: VerdictEntry[]
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

  // Map denied session verdicts to incident format
  const sessionIncidents: IncidentData[] = sessionVerdicts
    .filter((v) => v.consensus === 'DENIED')
    .map((v) => ({
      timestamp: Math.floor(v.timestamp / 1000),
      agentId: v.proposal?.agentId ?? '',
      incidentType: v.severity === 'CRITICAL' ? 0 : v.severity === 'MEDIUM' ? 1 : 2,
      incidentLabel: v.severity === 'CRITICAL' ? 'PolicyViolation' : 'ConsensusFailure',
      reason: `${v.model1.reason} | ${v.model2.reason}`,
      targetContract: v.proposal?.targetContract ?? '',
      attemptedValue: v.proposal?.value ?? '0',
    }))

  const allIncidents = [...sessionIncidents, ...incidents]

  return (
    <div className="bg-gray-900 rounded-2xl border border-red-900/30 p-8">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-black text-white">Incident Log</h2>
        <span className="text-base text-gray-500 bg-gray-800 px-4 py-1.5 rounded-full font-semibold">
          {allIncidents.length} incidents
          {sessionIncidents.length > 0 && (
            <span className="text-yellow-400 ml-2">(+{sessionIncidents.length} this session)</span>
          )}
        </span>
      </div>

      {loading && incidents.length === 0 && sessionIncidents.length === 0 ? (
        <p className="text-lg text-gray-500">Loading incidents...</p>
      ) : allIncidents.length === 0 ? (
        <p className="text-lg text-gray-500">
          No incidents recorded — all agents operating within policy
        </p>
      ) : (
        <div className="space-y-4 max-h-[500px] overflow-y-auto">
          {allIncidents.map((inc, i) => {
            const isSession = i < sessionIncidents.length
            return (
              <div
                key={`${inc.agentId}-${inc.timestamp}-${i}`}
                className={`bg-gray-800/50 rounded-xl p-5 border animate-slide-in ${
                  isSession ? 'border-yellow-500/30' : 'border-gray-700/50'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <span
                      className={`text-sm px-3 py-1 rounded-full font-bold ${TYPE_STYLES[inc.incidentLabel] ?? 'text-gray-400 bg-gray-400/10'}`}
                    >
                      {inc.incidentLabel}
                    </span>
                    {isSession && (
                      <span className="text-sm px-3 py-1 rounded-full text-yellow-400 bg-yellow-400/10 font-bold">
                        Demo
                      </span>
                    )}
                    <span className="text-base text-white font-semibold">
                      {agentName(inc.agentId)}
                    </span>
                  </div>
                  <span className="text-sm text-gray-500">
                    {inc.timestamp > 0
                      ? new Date(inc.timestamp * 1000).toLocaleString()
                      : 'N/A'}
                  </span>
                </div>
                <p className="text-base text-gray-300">{inc.reason}</p>
                <p className="text-sm text-gray-500 font-mono mt-2">
                  Target: {inc.targetContract.slice(0, 18)}...{inc.targetContract.slice(-8)}
                </p>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
