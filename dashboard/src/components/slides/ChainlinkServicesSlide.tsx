'use client'

import SlideLayout from './SlideLayout'

const services = [
  { name: 'CRE Workflow', desc: 'Orchestration backbone — HTTP trigger, verdict pipeline', status: 'Real', color: 'border-blue-500' },
  { name: 'HTTPClient', desc: 'Multi-AI consensus with ConsensusAggregationByFields', status: 'Real', color: 'border-cyan-500' },
  { name: 'EVMClient', desc: 'Read policies, write verdicts to SentinelGuardian', status: 'Real', color: 'border-green-500' },
  { name: 'CronCapability', desc: 'Periodic health checks, auto-freeze anomalous agents', status: 'Real', color: 'border-yellow-500' },
  { name: 'Confidential HTTP', desc: 'Hide API keys and guardrail thresholds from DON nodes', status: 'Real', color: 'border-purple-500' },
  { name: 'Confidential Compute', desc: 'Hide policy params from AI agents (prevent gaming)', status: 'Ready', color: 'border-orange-500' },
]

export default function ChainlinkServicesSlide() {
  return (
    <SlideLayout dark={false}>
      <h2 className="text-4xl font-bold text-white mb-2">
        Chainlink Services
      </h2>
      <p className="text-xl text-gray-400 mb-8">6 CRE capabilities used</p>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {services.map((s) => (
          <div
            key={s.name}
            className={`bg-gray-800/50 rounded-xl p-5 border-l-4 ${s.color}`}
          >
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-white font-semibold">{s.name}</h3>
              <span
                className={`text-xs px-2 py-0.5 rounded-full ${
                  s.status === 'Real'
                    ? 'text-green-400 bg-green-400/10'
                    : 'text-yellow-400 bg-yellow-400/10'
                }`}
              >
                {s.status}
              </span>
            </div>
            <p className="text-sm text-gray-400">{s.desc}</p>
          </div>
        ))}
      </div>

      <div className="mt-8 text-center">
        <p className="text-gray-400">
          Not a wrapper —{' '}
          <span className="text-white font-semibold">
            a native CRE application
          </span>
        </p>
      </div>
    </SlideLayout>
  )
}
