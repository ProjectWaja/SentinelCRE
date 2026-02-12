'use client'

import SlideLayout from './SlideLayout'

export default function DemoScenario1Slide() {
  return (
    <SlideLayout dark={false}>
      <h2 className="text-4xl font-bold text-white mb-2">Demo Scenario 1</h2>
      <p className="text-xl text-red-400 mb-8">Rogue DeFi Trading Agent</p>

      <div className="bg-gray-800/50 rounded-2xl p-8 border border-gray-700/50 mb-6">
        <p className="text-gray-300 mb-4">
          A compromised trading agent attempts unauthorized actions:
        </p>

        <div className="space-y-3">
          {[
            { attack: '100 ETH swap', limit: 'Max 1 ETH/tx', result: 'BLOCKED', confidence: '98%' },
            { attack: 'Unapproved contract', limit: 'Not on whitelist', result: 'BLOCKED', confidence: '95%' },
            { attack: 'Blocked function sig', limit: 'Blacklisted selector', result: 'BLOCKED', confidence: '97%' },
            { attack: '50 rapid-fire txs', limit: 'Rate limit: 10/60s', result: 'BLOCKED', confidence: 'On-chain' },
          ].map((row) => (
            <div
              key={row.attack}
              className="flex items-center justify-between bg-gray-900/80 rounded-lg p-3"
            >
              <div className="flex items-center gap-4">
                <span className="text-red-400 font-mono text-sm w-44">
                  {row.attack}
                </span>
                <span className="text-gray-500 text-sm">{row.limit}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-gray-400">{row.confidence}</span>
                <span className="text-red-400 font-bold bg-red-400/10 px-3 py-1 rounded text-sm">
                  {row.result}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <p className="text-center text-gray-400">
        Two-layer defense catches{' '}
        <span className="text-white font-semibold">every attack vector</span>
      </p>
    </SlideLayout>
  )
}
