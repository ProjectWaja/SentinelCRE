'use client'

import SlideLayout from './SlideLayout'

const services = [
  { name: 'ConfidentialHTTPClient', desc: 'TEE-backed AI calls — API keys via Vault DON, prompts hidden inside enclave', status: 'LIVE', color: 'border-purple-500' },
  { name: 'HTTPClient', desc: 'Multi-AI consensus via ConsensusAggregationByFields — identical verdict, median confidence', status: 'LIVE', color: 'border-cyan-500' },
  { name: 'ConsensusAggregation', desc: 'DON-level BFT agreement on AI verdict fields — no single node can override', status: 'LIVE', color: 'border-blue-500' },
  { name: 'EVMClient (5 methods)', desc: 'callContract, writeReport, filterLogs, headerByNumber, logTrigger', status: 'LIVE', color: 'border-green-500' },
  { name: 'CronCapability', desc: 'Periodic health checks — proactive anomaly detection beyond request-response', status: 'LIVE', color: 'border-yellow-500' },
  { name: 'HTTPCapability', desc: 'HTTP trigger receives ActionProposal payloads from AI agents', status: 'LIVE', color: 'border-blue-400' },
  { name: 'Data Feeds', desc: 'AggregatorV3Interface for Proof of Reserves — real-time reserve verification before mints', status: 'LIVE', color: 'border-orange-500' },
  { name: 'Automation', desc: 'checkUpkeep/performUpkeep — auto-finalize expired challenge appeals', status: 'READY', color: 'border-red-500' },
]

export default function ChainlinkServicesSlide() {
  return (
    <SlideLayout dark={false}>
      <h2 className="text-5xl font-bold text-white mb-3">
        Chainlink Services
      </h2>
      <p className="text-2xl text-gray-400 mb-10">8 CRE Primitives + 3 Trigger Types + Data Feeds + Automation</p>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {services.map((s) => (
          <div
            key={s.name}
            className={`bg-gray-800/50 rounded-xl p-5 border-l-4 ${s.color}`}
          >
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-white font-semibold text-base">{s.name}</h3>
              <span className={`text-sm px-2.5 py-0.5 rounded-full font-semibold ${
                s.status === 'LIVE'
                  ? 'text-green-400 bg-green-400/10'
                  : 'text-yellow-400 bg-yellow-400/10'
              }`}>
                {s.status}
              </span>
            </div>
            <p className="text-sm text-gray-400">{s.desc}</p>
          </div>
        ))}
      </div>

      <div className="mt-10 text-center">
        <p className="text-xl text-gray-400">
          Not a wrapper —{' '}
          <span className="text-white font-semibold">
            a native CRE application using every major capability
          </span>
        </p>
      </div>
    </SlideLayout>
  )
}
