'use client'

import SlideLayout from './SlideLayout'

const differentiators = [
  {
    title: 'Real Problem, Real Stakes',
    desc: '$1.5B+ stolen in 2025 across AI agent and DeFi exploits. AI agents are executing on-chain with zero risk infrastructure.',
    color: 'text-red-400',
    border: 'border-red-500',
  },
  {
    title: 'Three-Layer Defense',
    desc: 'On-chain compliance + behavioral risk scoring + multi-AI consensus. No single point of failure — all three must agree.',
    color: 'text-blue-400',
    border: 'border-blue-500',
  },
  {
    title: 'Deep CRE Integration',
    desc: '8 CRE primitives + 3 trigger types: ConfidentialHTTPClient, ConsensusAggregation, EVMClient (5 methods), Cron, HTTP, Log.',
    color: 'text-cyan-400',
    border: 'border-cyan-500',
  },
  {
    title: 'Proactive Risk Prevention',
    desc: 'Unlike kill switches that fire after damage, SentinelCRE blocks actions before they touch the chain.',
    color: 'text-green-400',
    border: 'border-green-500',
  },
  {
    title: '90 Tests, 5 Suites',
    desc: 'Production-grade: policy enforcement, challenge appeals, Proof of Reserves, circuit breakers, full lifecycle.',
    color: 'text-yellow-400',
    border: 'border-yellow-500',
  },
  {
    title: 'Confidential Compute',
    desc: 'ConfidentialHTTPClient hides behavioral weights, AI prompts, and API keys inside TEE. Agents see only APPROVED/DENIED.',
    color: 'text-purple-400',
    border: 'border-purple-500',
  },
]

export default function WhySentinelSlide() {
  return (
    <SlideLayout dark={false}>
      <h2 className="text-5xl font-bold text-white mb-10">
        Why SentinelCRE
      </h2>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-6">
        {differentiators.map((d) => (
          <div
            key={d.title}
            className={`bg-gray-800/50 rounded-xl p-7 border-l-4 ${d.border}`}
          >
            <h3 className={`font-semibold mb-3 text-xl ${d.color}`}>{d.title}</h3>
            <p className="text-lg text-gray-400">{d.desc}</p>
          </div>
        ))}
      </div>
    </SlideLayout>
  )
}
