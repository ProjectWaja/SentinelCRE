'use client'

import SlideLayout from './SlideLayout'

const differentiators = [
  {
    title: 'Real Problem, Real Stakes',
    desc: 'AI agents are executing on-chain today. Infinite mint exploits have drained $180M+ from real protocols.',
    color: 'text-red-400',
    border: 'border-red-500',
  },
  {
    title: 'Two-Layer Defense',
    desc: 'AI consensus + on-chain policy. Even if AI is wrong, hard-coded guardrails catch what they miss.',
    color: 'text-blue-400',
    border: 'border-blue-500',
  },
  {
    title: 'Deep CRE Integration',
    desc: '5+ CRE capabilities: HTTPClient, EVMClient, Cron, Confidential HTTP, ConsensusAggregation.',
    color: 'text-cyan-400',
    border: 'border-cyan-500',
  },
  {
    title: 'Proactive, Not Reactive',
    desc: 'Unlike kill switches that fire after damage, SentinelCRE blocks actions before execution.',
    color: 'text-green-400',
    border: 'border-green-500',
  },
  {
    title: '61 Tests, 3 Suites',
    desc: 'Production-grade coverage: infinite mint, rate limiting, circuit breaker, full lifecycle.',
    color: 'text-yellow-400',
    border: 'border-yellow-500',
  },
  {
    title: 'Confidential Compute Ready',
    desc: 'Policy thresholds hidden from AI agents, preventing them from gaming their own limits.',
    color: 'text-purple-400',
    border: 'border-purple-500',
  },
]

export default function WhySentinelSlide() {
  return (
    <SlideLayout dark={false}>
      <h2 className="text-4xl font-bold text-white mb-8">
        Why SentinelCRE Wins
      </h2>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {differentiators.map((d) => (
          <div
            key={d.title}
            className={`bg-gray-800/50 rounded-xl p-5 border-l-4 ${d.border}`}
          >
            <h3 className={`font-semibold mb-2 ${d.color}`}>{d.title}</h3>
            <p className="text-sm text-gray-400">{d.desc}</p>
          </div>
        ))}
      </div>
    </SlideLayout>
  )
}
