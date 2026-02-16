'use client'

import type { VerdictEntry } from '@/hooks/useVerdictHistory'
import { getSessionPerformance, REAL_EXPLOIT_MAP } from '@/lib/guardian-data'
import GuardianStatsBar from './GuardianStatsBar'
import AgentProfileCards from './AgentProfileCards'
import ThreatTimeline from './ThreatTimeline'
import DefenseAnalyticsCharts from './DefenseAnalyticsCharts'
import IncidentDetailLog from './IncidentDetailLog'

const DEPLOYER = '0x23fC03ec91D319e4Aa14e90b6d3664540FDf2446'
const GUARDIAN_ADDR = '0x5F938e4c62991Eb4af3Dd89097978A1f376e6CC8'
const REGISTRY_ADDR = '0xFA7deF53FEaC45dB96A5B15C32ca4E6B009b25e6'
const TENDERLY_TX = 'https://dashboard.tenderly.co/project-waja/sentinelcre/testnet/9c734d91-b707-484a-a7be-db55b67eac02/transactions'

interface Props {
  sessionVerdicts: VerdictEntry[]
}

function WalletInfoBar() {
  const wallets = [
    { label: 'Deployer', address: DEPLOYER, color: 'text-green-400' },
    { label: 'SentinelGuardian', address: GUARDIAN_ADDR, color: 'text-red-400' },
    { label: 'AgentRegistry', address: REGISTRY_ADDR, color: 'text-blue-400' },
  ]

  return (
    <div className="bg-gray-900 rounded-2xl border border-gray-800 p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-6 h-6 rounded bg-green-500/20 flex items-center justify-center">
            <svg className="w-3.5 h-3.5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
          </div>
          <h2 className="text-sm font-black text-white uppercase tracking-widest">
            On-Chain Deployment
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
          <span className="text-xs font-bold text-purple-400 bg-purple-400/10 px-3 py-1 rounded-full border border-purple-400/30">
            Tenderly Virtual Sepolia
          </span>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
        {wallets.map((w) => (
          <a
            key={w.label}
            href={TENDERLY_TX}
            target="_blank"
            rel="noopener noreferrer"
            className="flex flex-col p-3 bg-gray-800/50 rounded-lg border border-gray-700/50 hover:border-purple-500/30 transition-colors group"
          >
            <span className="text-xs text-gray-500 font-bold uppercase tracking-wider mb-1">
              {w.label}
            </span>
            <code className={`text-xs font-mono ${w.color} truncate group-hover:text-purple-400 transition-colors`}>
              {w.address}
            </code>
          </a>
        ))}
      </div>
    </div>
  )
}

function SessionPerformance({ verdicts }: { verdicts: VerdictEntry[] }) {
  const perf = getSessionPerformance(verdicts)

  const metrics = [
    {
      label: 'Detection Rate',
      value: perf.total > 0 ? `${perf.detectionRate}%` : 'N/A',
      sub: perf.denied > 0 ? `${perf.denied}/${perf.denied} attacks caught` : 'Run scenarios to test',
      color: perf.detectionRate === 100 ? 'text-green-400' : 'text-yellow-400',
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
      ),
    },
    {
      label: 'False Positive Rate',
      value: perf.total > 0 ? `${perf.falsePositiveRate}%` : 'N/A',
      sub: perf.approved > 0 ? `${perf.approved} safe actions approved correctly` : 'No safe actions tested',
      color: perf.falsePositiveRate === 0 ? 'text-green-400' : 'text-red-400',
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      ),
    },
    {
      label: 'Avg Latency',
      value: perf.avgLatency,
      sub: 'Proposal to verdict (end-to-end)',
      color: 'text-cyan-400',
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    {
      label: 'Attacks Prevented',
      value: perf.attacksPreventedValue,
      sub: 'Based on real-world exploit equivalents',
      color: perf.denied > 0 ? 'text-red-400' : 'text-gray-400',
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
  ]

  return (
    <div className="bg-gray-900 rounded-2xl border border-gray-800 p-5">
      <div className="flex items-center gap-2.5 mb-4">
        <div className="w-6 h-6 rounded bg-cyan-500/20 flex items-center justify-center">
          <svg className="w-3.5 h-3.5 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        </div>
        <h2 className="text-sm font-black text-white uppercase tracking-widest">
          Session Performance
        </h2>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {metrics.map((m) => (
          <div key={m.label} className="bg-gray-800/50 rounded-lg border border-gray-700/50 p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className={m.color}>{m.icon}</span>
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">{m.label}</span>
            </div>
            <p className={`text-2xl font-black ${m.color} leading-none mb-1`}>{m.value}</p>
            <p className="text-xs text-gray-500">{m.sub}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function GuardianTab({ sessionVerdicts }: Props) {
  return (
    <div className="space-y-6">
      <WalletInfoBar />
      <SessionPerformance verdicts={sessionVerdicts} />
      <GuardianStatsBar sessionVerdicts={sessionVerdicts} />
      <AgentProfileCards sessionVerdicts={sessionVerdicts} />
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        <div className="xl:col-span-7">
          <ThreatTimeline sessionVerdicts={sessionVerdicts} />
        </div>
        <div className="xl:col-span-5">
          <DefenseAnalyticsCharts sessionVerdicts={sessionVerdicts} />
        </div>
      </div>
      <IncidentDetailLog sessionVerdicts={sessionVerdicts} />
    </div>
  )
}
