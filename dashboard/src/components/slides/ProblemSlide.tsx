'use client'

import SlideLayout from './SlideLayout'

const historicAttacks = [
  { name: 'Ronin Bridge', year: '2022', loss: '$625M', desc: 'Unauthorized validator signatures', color: 'border-red-500' },
  { name: 'Poly Network', year: '2021', loss: '$611M', desc: 'Forged cross-chain relay message', color: 'border-red-500' },
  { name: 'Wormhole', year: '2022', loss: '$320M', desc: 'Uncollateralized 120K wETH mint', color: 'border-orange-500' },
  { name: 'Euler Finance', year: '2023', loss: '$197M', desc: 'Flash loan function sequence', color: 'border-orange-500' },
]

const recentAttacks = [
  { name: 'Bybit Hack', year: 'Feb 2025', loss: '$1.5B', desc: 'Largest single crypto theft — unprecedented withdrawal', color: 'border-red-600' },
  { name: 'Moonwell Exploit', year: 'Feb 2025', loss: '$1.78M', desc: 'AI-generated oracle manipulation bug', color: 'border-orange-500' },
  { name: 'AIXBT Hack', year: 'Mar 2025', loss: '$106K', desc: 'Dashboard compromise at 2 AM — off-hours drain', color: 'border-yellow-500' },
  { name: 'Anthropic Research', year: '2025', loss: '50%+ exploited', desc: 'AI agents autonomously exploit historical contracts', color: 'border-purple-500' },
]

export default function ProblemSlide() {
  return (
    <SlideLayout>
      <h2 className="text-5xl font-bold text-white mb-3">The Problem</h2>
      <p className="text-2xl text-red-400 mb-8">No Risk Infrastructure for Autonomous AI Agents</p>

      <p className="text-xl text-gray-300 mb-8 max-w-4xl">
        AI agents are executing real on-chain actions — DeFi swaps, token mints,
        treasury management. When compromised, there is{' '}
        <span className="text-red-400 font-semibold">
          no decentralized risk layer
        </span>{' '}
        to stop them.
      </p>

      <div className="grid grid-cols-4 gap-4 mb-6">
        {historicAttacks.map((a) => (
          <div
            key={a.name}
            className={`bg-gray-900/80 rounded-xl p-5 border-l-4 ${a.color}`}
          >
            <p className="text-2xl font-bold text-red-400 mb-1">{a.loss}</p>
            <p className="text-white font-semibold">{a.name}</p>
            <p className="text-sm text-gray-400 mt-1">{a.desc}</p>
          </div>
        ))}
      </div>

      <p className="text-lg text-gray-500 font-semibold mb-4 uppercase tracking-wide">2025 — The problem is accelerating</p>

      <div className="grid grid-cols-4 gap-4 mb-8">
        {recentAttacks.map((a) => (
          <div
            key={a.name}
            className={`bg-gray-900/80 rounded-xl p-5 border-l-4 ${a.color}`}
          >
            <p className="text-2xl font-bold text-red-400 mb-1">{a.loss}</p>
            <p className="text-white font-semibold">{a.name}</p>
            <p className="text-xs text-gray-500">{a.year}</p>
            <p className="text-sm text-gray-400 mt-1">{a.desc}</p>
          </div>
        ))}
      </div>

      <p className="text-center text-4xl font-bold text-red-400">
        $3.4B+ stolen — every exploit SentinelCRE would have blocked
      </p>
    </SlideLayout>
  )
}
