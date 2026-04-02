'use client'

import SlideLayout from './SlideLayout'

export default function DemoScenario1Slide() {
  return (
    <SlideLayout dark={false}>
      <h2 className="text-5xl font-bold text-white mb-3">Demo Scenario 1</h2>
      <p className="text-2xl text-red-400 mb-10">Rogue DeFi Trading Agent</p>

      <div className="bg-gray-800/50 rounded-2xl p-10 border border-gray-700/50 mb-8">
        <p className="text-xl text-gray-300 mb-6">
          A compromised trading agent attempts unauthorized actions:
        </p>

        <div className="space-y-4">
          {[
            { attack: '100 ETH swap', limit: 'Max 1 ETH/tx', result: 'BLOCKED', confidence: 'Policy' },
            { attack: 'Unapproved contract', limit: 'Not on whitelist', result: 'BLOCKED', confidence: 'Policy' },
            { attack: 'Blocked function sig', limit: 'Blacklisted selector', result: 'BLOCKED', confidence: 'Policy' },
            { attack: '50 rapid-fire txs', limit: 'Rate limit: 10/60s', result: 'BLOCKED', confidence: 'On-chain' },
          ].map((row) => (
            <div
              key={row.attack}
              className="flex items-center justify-between bg-gray-900/80 rounded-lg p-4"
            >
              <div className="flex items-center gap-6">
                <span className="text-red-400 font-mono text-lg w-52">
                  {row.attack}
                </span>
                <span className="text-gray-500 text-lg">{row.limit}</span>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-base text-gray-400">{row.confidence}</span>
                <span className="text-red-400 font-bold bg-red-400/10 px-4 py-1.5 rounded text-lg">
                  {row.result}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <p className="text-center text-xl text-gray-400">
        Three-layer defense catches{' '}
        <span className="text-white font-semibold">every attack vector</span>
      </p>
    </SlideLayout>
  )
}
