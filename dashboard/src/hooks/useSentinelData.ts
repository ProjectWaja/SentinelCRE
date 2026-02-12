'use client'

import { useState, useEffect, useCallback } from 'react'

export interface AgentData {
  agentId: string
  name: string
  description: string
  owner: string
  registeredAt: number
  state: 'Active' | 'Frozen' | 'Revoked'
  stateCode: number
  policy: {
    maxTransactionValue: string
    maxDailyVolume: string
    maxMintAmount: string
    rateLimit: number
    rateLimitWindow: number
    requireMultiAiConsensus: boolean
    isActive: boolean
  }
  stats: {
    totalApproved: number
    totalDenied: number
    currentWindowActions: number
    currentDailyVolume: number
  }
  incidentCount: number
}

export interface SentinelDashboardData {
  agents: AgentData[]
  totalApproved: number
  totalDenied: number
  activeAgents: number
  frozenAgents: number
  apiHealthy: boolean
  isLive: boolean
  lastUpdated: number
  error: string | null
}

const POLL_INTERVAL = 5_000

const EMPTY: SentinelDashboardData = {
  agents: [],
  totalApproved: 0,
  totalDenied: 0,
  activeAgents: 0,
  frozenAgents: 0,
  apiHealthy: false,
  isLive: false,
  lastUpdated: 0,
  error: null,
}

export function useSentinelData() {
  const [data, setData] = useState<SentinelDashboardData>(EMPTY)

  const refresh = useCallback(async () => {
    try {
      const [agentsRes, healthRes] = await Promise.all([
        fetch('/api/agents').then((r) => r.json()),
        fetch('/api/health')
          .then((r) => r.json())
          .catch(() => ({ status: 'offline' })),
      ])

      const agents: AgentData[] = agentsRes.agents ?? []
      const totalApproved = agents.reduce((s, a) => s + a.stats.totalApproved, 0)
      const totalDenied = agents.reduce((s, a) => s + a.stats.totalDenied, 0)
      const activeAgents = agents.filter((a) => a.state === 'Active').length
      const frozenAgents = agents.filter((a) => a.state === 'Frozen').length

      setData({
        agents,
        totalApproved,
        totalDenied,
        activeAgents,
        frozenAgents,
        apiHealthy: healthRes.status === 'healthy',
        isLive: agentsRes.isLive ?? false,
        lastUpdated: Date.now(),
        error: null,
      })
    } catch (err) {
      setData((prev) => ({
        ...prev,
        error: String(err),
        lastUpdated: Date.now(),
      }))
    }
  }, [])

  useEffect(() => {
    refresh()
    const id = setInterval(refresh, POLL_INTERVAL)
    return () => clearInterval(id)
  }, [refresh])

  return { data, refresh }
}
