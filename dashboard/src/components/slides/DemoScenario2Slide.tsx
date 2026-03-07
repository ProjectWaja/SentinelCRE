'use client'

import SlideLayout from './SlideLayout'

export default function DemoScenario2Slide() {
  return (
    <SlideLayout>
      <h2 className="text-5xl font-bold text-white mb-3">Demo Scenario 2</h2>
      <p className="text-2xl text-red-400 mb-10">
        Infinite Stablecoin Mint Attack
      </p>

      <div className="grid grid-cols-2 gap-10">
        <div className="space-y-6">
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-6">
            <p className="text-lg text-gray-400 mb-1">Attack</p>
            <p className="text-3xl font-bold text-red-400">
              Mint 1,000,000,000 tokens
            </p>
            <p className="text-lg text-gray-500 mt-2">Policy cap: 1,000,000</p>
          </div>

          <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-6">
            <p className="text-lg text-gray-400 mb-3">Layer 3: Dual-AI Consensus</p>
            <div className="space-y-3">
              <div className="flex justify-between text-lg">
                <span className="text-gray-300">Claude</span>
                <span className="text-red-400 font-semibold">
                  DENIED (99%)
                </span>
              </div>
              <div className="flex justify-between text-lg">
                <span className="text-gray-300">GPT-4</span>
                <span className="text-red-400 font-semibold">
                  DENIED (99%)
                </span>
              </div>
              <p className="text-sm text-gray-500 mt-2">
                &quot;Mint amount exceeds safe cap — potential infinite mint attack&quot;
              </p>
            </div>
          </div>

          <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-6">
            <p className="text-lg text-gray-400 mb-3">
              Layer 1: On-Chain Policy
            </p>
            <div className="flex justify-between text-lg">
              <span className="text-gray-300">checkMintAmount()</span>
              <span className="text-red-400 font-semibold">FAIL</span>
            </div>
            <p className="text-sm text-gray-500 mt-2">
              Even if AI approved, policy catches it
            </p>
          </div>
        </div>

        <div className="flex flex-col justify-center">
          <div className="bg-red-500/10 border-2 border-red-500/50 rounded-2xl p-10 text-center">
            <div className="text-7xl mb-6">&#x1F6E1;</div>
            <p className="text-4xl font-bold text-red-400 mb-3">
              CIRCUIT BREAKER
            </p>
            <p className="text-xl text-gray-300 mb-6">Agent Frozen</p>
            <div className="space-y-2 text-lg text-gray-400">
              <p>Incident logged immutably</p>
              <p>Admin-only recovery</p>
              <p className="text-green-400 font-semibold mt-4">
                Not a single token minted
              </p>
            </div>
          </div>
        </div>
      </div>
    </SlideLayout>
  )
}
