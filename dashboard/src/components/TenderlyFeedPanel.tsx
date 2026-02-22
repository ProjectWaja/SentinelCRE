'use client'

import { useState, useEffect, useCallback } from 'react'

interface RecentTx {
  hash: string
  fullHash: string
  fn: string
  target: 'guardian' | 'registry' | 'other'
  block: number
}

interface TenderlyData {
  guardianTxCount: number
  registryTxCount: number
  recentTxs: RecentTx[]
  latestBlock: number
}

const CONTRACTS = [
  {
    name: 'SentinelGuardian',
    address: '0x5F938e4c62991Eb4af3Dd89097978A1f376e6CC8',
    role: 'Core risk engine — compliance checks, circuit breakers, agent lifecycle',
    key: 'guardian' as const,
  },
  {
    name: 'AgentRegistry',
    address: '0xFA7deF53FEaC45dB96A5B15C32ca4E6B009b25e6',
    role: 'Agent metadata registry — name, description, owner',
    key: 'registry' as const,
  },
]

const TENDERLY_EXPLORER = 'https://dashboard.tenderly.co/project-waja/sentinelcre/testnet/9c734d91-b707-484a-a7be-db55b67eac02/transactions'

const FN_COLORS: Record<string, string> = {
  processVerdict: 'text-yellow-400',
  unfreezeAgent: 'text-cyan-400',
  registerAgent: 'text-green-400',
  grantRole: 'text-blue-400',
  updatePolicy: 'text-orange-400',
}

export default function TenderlyFeedPanel() {
  const [data, setData] = useState<TenderlyData | null>(null)
  const [loading, setLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState<number>(0)

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/tenderly')
      if (res.ok) {
        const json = await res.json()
        setData(json)
        setLastUpdated(Date.now())
      }
    } catch {
      // Silent fail — will retry on next poll
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 12000)
    return () => clearInterval(interval)
  }, [fetchData])

  const getTxCount = (key: 'guardian' | 'registry') => {
    if (!data) return '...'
    return key === 'guardian' ? data.guardianTxCount : data.registryTxCount
  }

  const secondsAgo = lastUpdated ? Math.floor((Date.now() - lastUpdated) / 1000) : null

  return (
    <div className="bg-gray-900 rounded-2xl border border-gray-800 p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-6 h-6 rounded bg-purple-500/20 flex items-center justify-center">
            <svg className="w-3.5 h-3.5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
            </svg>
          </div>
          <h2 className="text-xl font-black text-white uppercase tracking-widest">
            Tenderly
          </h2>
        </div>
        <div className="flex items-center gap-2">
          {loading && !data ? (
            <span className="text-base text-gray-500">Loading...</span>
          ) : (
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" title={secondsAgo !== null ? `Updated ${secondsAgo}s ago` : ''} />
          )}
          <span className="text-base font-bold text-purple-400 bg-purple-400/10 px-3 py-1 rounded-full border border-purple-400/30">
            Virtual Sepolia
          </span>
        </div>
      </div>

      {/* Loading skeleton */}
      {loading && !data && (
        <div className="space-y-2.5">
          {[1, 2].map((i) => (
            <div key={i} className="p-3 bg-gray-800/50 rounded-lg border border-gray-700/50">
              <div className="flex items-center justify-between mb-2">
                <div className="skeleton h-4 w-32" />
                <div className="skeleton h-4 w-16" />
              </div>
              <div className="skeleton h-3 w-full mb-2" />
              <div className="skeleton h-3 w-48" />
            </div>
          ))}
        </div>
      )}

      {/* Contract cards */}
      <div className={`space-y-2.5 ${loading && !data ? 'hidden' : ''}`}>
        {CONTRACTS.map((c) => (
          <a
            key={c.address}
            href={TENDERLY_EXPLORER}
            target="_blank"
            rel="noopener noreferrer"
            className="block p-3 bg-gray-800/50 rounded-lg border border-gray-700/50 hover:border-purple-500/30 hover:bg-gray-800 transition-all group"
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-base font-bold text-white group-hover:text-purple-400 transition-colors">
                {c.name}
              </span>
              <span className="text-base font-bold text-green-400 bg-green-400/10 px-2 py-0.5 rounded border border-green-400/20">
                {getTxCount(c.key)} txs
              </span>
            </div>
            <code className="text-base text-purple-400/70 font-mono block truncate group-hover:text-purple-400 transition-colors">
              {c.address}
            </code>
            <p className="text-base text-gray-500 mt-1">{c.role}</p>
          </a>
        ))}
      </div>

      {/* Recent transactions feed */}
      {data && data.recentTxs.length > 0 && (
        <div className="mt-3 pt-3 border-t border-gray-800">
          <div className="flex items-center justify-between mb-2">
            <span className="text-base font-bold text-gray-400 uppercase tracking-wider">Recent Transactions</span>
            <span className="text-base text-gray-600">Block {data.latestBlock.toLocaleString()}</span>
          </div>
          <div className="space-y-1">
            {data.recentTxs.map((tx) => (
              <div key={tx.fullHash} className="flex items-center justify-between text-base py-1 px-2 rounded bg-gray-800/30">
                <div className="flex items-center gap-2">
                  <span className={`font-mono font-bold ${FN_COLORS[tx.fn] ?? 'text-gray-400'}`}>
                    {tx.fn}
                  </span>
                </div>
                <code className="text-gray-600 font-mono">{tx.hash}</code>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-3 pt-3 border-t border-gray-800">
        <a
          href={TENDERLY_EXPLORER}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 text-base text-purple-400/70 hover:text-purple-400 transition-colors font-medium"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
          View on Tenderly Explorer
        </a>
      </div>
    </div>
  )
}
