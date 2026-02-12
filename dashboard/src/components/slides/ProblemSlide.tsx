'use client'

import SlideLayout from './SlideLayout'

const attacks = [
  {
    name: 'Paid Network',
    loss: '$180M',
    desc: 'Infinite mint exploit drained the entire protocol',
    color: 'border-red-500',
  },
  {
    name: 'Cover Protocol',
    loss: '$4M+',
    desc: 'Attacker minted tokens to crash the price to near zero',
    color: 'border-orange-500',
  },
  {
    name: 'Uranium Finance',
    loss: '$50M',
    desc: 'Balance manipulation led to complete fund drain',
    color: 'border-yellow-500',
  },
]

export default function ProblemSlide() {
  return (
    <SlideLayout>
      <h2 className="text-4xl font-bold text-white mb-2">The Problem</h2>
      <p className="text-xl text-red-400 mb-8">AI Agents Are Going Rogue</p>

      <p className="text-lg text-gray-300 mb-8 max-w-3xl">
        AI agents are executing real on-chain actions — DeFi swaps, token mints,
        contract calls. When compromised, there is{' '}
        <span className="text-red-400 font-semibold">
          no decentralized safety layer
        </span>{' '}
        to prevent catastrophic actions.
      </p>

      <div className="grid grid-cols-3 gap-4 mb-8">
        {attacks.map((a) => (
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

      <p className="text-center text-3xl font-bold text-red-400">
        $230M+ lost to exploits SentinelCRE prevents
      </p>
    </SlideLayout>
  )
}
