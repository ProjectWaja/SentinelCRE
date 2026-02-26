'use client'

import SlideLayout from './SlideLayout'

const attacks = [
  { name: 'Ronin Bridge', loss: '$625M', desc: 'Unauthorized validator signatures drained cross-chain bridge', color: 'border-red-500' },
  { name: 'Poly Network', loss: '$611M', desc: 'Forged relay message exploited cross-chain verification', color: 'border-red-500' },
  { name: 'Wormhole', loss: '$320M', desc: 'Uncollateralized mint — 120K wETH created from nothing', color: 'border-orange-500' },
  { name: 'Euler Finance', loss: '$197M', desc: 'Flash loan attack via unusual function call sequence', color: 'border-orange-500' },
  { name: 'Nomad Bridge', loss: '$190M', desc: 'Crowd-sourced drain — hundreds of copycats in hours', color: 'border-yellow-500' },
  { name: 'Beanstalk', loss: '$182M', desc: 'Governance manipulation via flash loan voting', color: 'border-yellow-500' },
  { name: 'Mango Markets', loss: '$114M', desc: 'Oracle price manipulation to drain lending pool', color: 'border-yellow-500' },
]

export default function ProblemSlide() {
  return (
    <SlideLayout>
      <h2 className="text-4xl font-bold text-white mb-2">The Problem</h2>
      <p className="text-xl text-red-400 mb-6">No Risk Infrastructure for Autonomous Agents</p>

      <p className="text-lg text-gray-300 mb-6 max-w-3xl">
        AI agents are executing real on-chain actions — DeFi swaps, token mints,
        treasury management. When compromised, there is{' '}
        <span className="text-red-400 font-semibold">
          no decentralized risk layer
        </span>{' '}
        to prevent catastrophic loss.
      </p>

      <div className="grid grid-cols-4 gap-3 mb-6">
        {attacks.slice(0, 4).map((a) => (
          <div
            key={a.name}
            className={`bg-gray-900/80 rounded-xl p-4 border-l-4 ${a.color}`}
          >
            <p className="text-xl font-bold text-red-400 mb-1">{a.loss}</p>
            <p className="text-white font-semibold text-sm">{a.name}</p>
            <p className="text-xs text-gray-400 mt-1">{a.desc}</p>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-3 gap-3 mb-6">
        {attacks.slice(4).map((a) => (
          <div
            key={a.name}
            className={`bg-gray-900/80 rounded-xl p-4 border-l-4 ${a.color}`}
          >
            <p className="text-xl font-bold text-red-400 mb-1">{a.loss}</p>
            <p className="text-white font-semibold text-sm">{a.name}</p>
            <p className="text-xs text-gray-400 mt-1">{a.desc}</p>
          </div>
        ))}
      </div>

      <p className="text-center text-3xl font-bold text-red-400">
        $2.2 billion stolen — every exploit SentinelCRE would have blocked
      </p>
    </SlideLayout>
  )
}
