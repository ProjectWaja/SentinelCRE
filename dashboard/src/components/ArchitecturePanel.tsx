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
      <div className="bg-gray-900 rounded-xl border border-gray-800 p-6">
        <h2 className="text-lg font-semibold text-white mb-4">
          Chainlink Services
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {SERVICES.map((s) => (
            <div
              key={s.name}
              className={`${s.bg} rounded-lg p-4 border ${s.border}`}
            >
              <div className="flex items-center justify-between mb-1">
                <h3 className={`font-medium ${s.color}`}>{s.name}</h3>
                <span
                  className={`text-xs px-1.5 py-0.5 rounded ${
                    s.status === 'Real'
                      ? 'text-green-400 bg-green-400/10'
                      : 'text-yellow-400 bg-yellow-400/10'
                  }`}
                >
                  {s.status}
                </span>
              </div>
              <p className="text-xs text-gray-400">{s.desc}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-gray-900 rounded-xl border border-gray-800 p-6">
        <h2 className="text-lg font-semibold text-white mb-4">
          Smart Contracts
        </h2>
        <div className="space-y-3">
          {CONTRACTS.map((c) => (
            <div
              key={c.name}
              className="bg-gray-800/50 rounded-lg p-4 border border-gray-700/50 flex items-center justify-between"
            >
              <div>
                <h3 className="font-mono text-sm text-white">{c.name}</h3>
                <p className="text-xs text-gray-400">{c.desc}</p>
              </div>
              {c.tests > 0 && (
                <span className="text-xs text-green-400 bg-green-400/10 px-2 py-1 rounded">
                  {c.tests} tests
                </span>
              )}
            </div>
          ))}
        </div>
        <div className="mt-4 text-center">
          <span className="text-sm font-semibold text-green-400">
            61 tests passing
          </span>
          <span className="text-sm text-gray-500"> across 3 test suites</span>
        </div>
      </div>

      <div className="bg-gray-900 rounded-xl border border-gray-800 p-6">
        <h2 className="text-lg font-semibold text-white mb-4">
          Verdict Pipeline
        </h2>
        <div className="font-mono text-xs text-gray-400 leading-relaxed space-y-1">
          <p>
            <span className="text-blue-400">1.</span> AI Agent proposes action
          </p>
          <p className="text-gray-600">{'   ↓'}</p>
          <p>
            <span className="text-blue-400">2.</span> CRE HTTP Trigger receives
            proposal
          </p>
          <p className="text-gray-600">{'   ↓'}</p>
          <p>
            <span className="text-cyan-400">3.</span> EVMClient reads agent
            policy from SentinelGuardian
          </p>
          <p className="text-gray-600">{'   ↓'}</p>
          <p>
            <span className="text-purple-400">4.</span> HTTPClient calls AI
            Model 1 + AI Model 2
          </p>
          <p className="text-gray-600">{'   ↓'}</p>
          <p>
            <span className="text-yellow-400">5.</span> Consensus: Both models
            must APPROVE
          </p>
          <p className="text-gray-600">{'   ↓'}</p>
          <p>
            <span className="text-green-400">6a.</span>{' '}
            <span className="text-green-400">APPROVED</span> → On-chain policy
            check → forward action
          </p>
          <p>
            <span className="text-red-400">6b.</span>{' '}
            <span className="text-red-400">DENIED</span> → Circuit breaker →
            agent frozen → incident logged
          </p>
        </div>
      </div>
    </div>
  )
}
