'use client'

const SERVICES = [
  {
    name: 'CRE Workflow',
    desc: 'Multi-AI consensus verdict pipeline with HTTP + Cron triggers',
    color: 'text-blue-400',
    bg: 'bg-blue-400/10',
    border: 'border-blue-400/20',
    status: 'Real',
  },
  {
    name: 'HTTPClient',
    desc: 'Calls 2 AI models with ConsensusAggregationByFields',
    color: 'text-cyan-400',
    bg: 'bg-cyan-400/10',
    border: 'border-cyan-400/20',
    status: 'Real',
  },
  {
    name: 'EVMClient',
    desc: 'Reads policies, writes verdicts to SentinelGuardian contract',
    color: 'text-green-400',
    bg: 'bg-green-400/10',
    border: 'border-green-400/20',
    status: 'Real',
  },
  {
    name: 'CronCapability',
    desc: 'Periodic health checks, auto-freeze anomalous agents',
    color: 'text-yellow-400',
    bg: 'bg-yellow-400/10',
    border: 'border-yellow-400/20',
    status: 'Real',
  },
  {
    name: 'Confidential HTTP',
    desc: 'Hides API keys and guardrail thresholds from DON nodes',
    color: 'text-purple-400',
    bg: 'bg-purple-400/10',
    border: 'border-purple-400/20',
    status: 'Real',
  },
  {
    name: 'Confidential Compute',
    desc: 'Hide policy params from AI agents to prevent gaming',
    color: 'text-orange-400',
    bg: 'bg-orange-400/10',
    border: 'border-orange-400/20',
    status: 'Ready',
  },
]

const CONTRACTS = [
  {
    name: 'SentinelGuardian.sol',
    desc: 'Policy enforcement, circuit breakers, incident log',
    tests: 45,
  },
  {
    name: 'AgentRegistry.sol',
    desc: 'Agent registration and metadata',
    tests: 8,
  },
  {
    name: 'PolicyLib.sol',
    desc: 'Pure validation: value, target, function, rate, mint',
    tests: 0,
  },
]

export default function ArchitecturePanel() {
  return (
    <div className="space-y-6">
      <div className="bg-gray-900 rounded-2xl border border-gray-800 p-8">
        <h2 className="text-2xl font-black text-white mb-6">
          Chainlink Services
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {SERVICES.map((s) => (
            <div
              key={s.name}
              className={`${s.bg} rounded-xl p-5 border ${s.border}`}
            >
              <div className="flex items-center justify-between mb-2">
                <h3 className={`text-lg font-bold ${s.color}`}>{s.name}</h3>
                <span
                  className={`text-sm px-2.5 py-1 rounded-full font-semibold ${
                    s.status === 'Real'
                      ? 'text-green-400 bg-green-400/10'
                      : 'text-yellow-400 bg-yellow-400/10'
                  }`}
                >
                  {s.status}
                </span>
              </div>
              <p className="text-base text-gray-400">{s.desc}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-gray-900 rounded-2xl border border-gray-800 p-8">
        <h2 className="text-2xl font-black text-white mb-6">
          Smart Contracts
        </h2>
        <div className="space-y-4">
          {CONTRACTS.map((c) => (
            <div
              key={c.name}
              className="bg-gray-800/50 rounded-xl p-5 border border-gray-700/50 flex items-center justify-between"
            >
              <div>
                <h3 className="font-mono text-lg text-white font-semibold">{c.name}</h3>
                <p className="text-base text-gray-400">{c.desc}</p>
              </div>
              {c.tests > 0 && (
                <span className="text-sm text-green-400 bg-green-400/10 px-3 py-1.5 rounded-full font-semibold">
                  {c.tests} tests
                </span>
              )}
            </div>
          ))}
        </div>
        <div className="mt-5 text-center">
          <span className="text-lg font-bold text-green-400">
            61 tests passing
          </span>
          <span className="text-lg text-gray-500"> across 3 test suites</span>
        </div>
      </div>

      <div className="bg-gray-900 rounded-2xl border border-gray-800 p-8">
        <h2 className="text-2xl font-black text-white mb-6">
          Verdict Pipeline
        </h2>
        <div className="font-mono text-base text-gray-400 leading-relaxed space-y-2">
          <p>
            <span className="text-blue-400 font-bold">1.</span> AI Agent proposes action
          </p>
          <p className="text-gray-600 pl-4">{'↓'}</p>
          <p>
            <span className="text-blue-400 font-bold">2.</span> CRE HTTP Trigger receives
            proposal
          </p>
          <p className="text-gray-600 pl-4">{'↓'}</p>
          <p>
            <span className="text-cyan-400 font-bold">3.</span> EVMClient reads agent
            policy from SentinelGuardian
          </p>
          <p className="text-gray-600 pl-4">{'↓'}</p>
          <p>
            <span className="text-purple-400 font-bold">4.</span> HTTPClient calls AI
            Claude + GPT-4
          </p>
          <p className="text-gray-600 pl-4">{'↓'}</p>
          <p>
            <span className="text-yellow-400 font-bold">5.</span> Consensus: Both models
            must APPROVE
          </p>
          <p className="text-gray-600 pl-4">{'↓'}</p>
          <p>
            <span className="text-green-400 font-bold">6a.</span>{' '}
            <span className="text-green-400 font-bold">APPROVED</span> → On-chain policy
            check → forward action
          </p>
          <p>
            <span className="text-red-400 font-bold">6b.</span>{' '}
            <span className="text-red-400 font-bold">DENIED</span> → Circuit breaker →
            agent frozen → incident logged
          </p>
        </div>
      </div>
    </div>
  )
}
