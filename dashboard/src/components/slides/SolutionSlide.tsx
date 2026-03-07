'use client'

import SlideLayout from './SlideLayout'

export default function SolutionSlide() {
  return (
    <SlideLayout dark={false}>
      <h2 className="text-5xl font-bold text-white mb-3">The Solution</h2>
      <p className="text-2xl text-green-400 mb-10">Three Independent Risk Assessment Layers</p>

      <div className="grid grid-cols-3 gap-8">
        <div className="bg-green-500/10 border border-green-500/30 rounded-2xl p-8">
          <div className="text-3xl mb-3">Layer 1</div>
          <h3 className="text-2xl font-bold text-green-400 mb-4">
            On-Chain Compliance
          </h3>
          <ul className="space-y-3 text-gray-300 text-lg">
            <li className="flex items-start gap-2">
              <span className="text-green-400 mt-0.5">&#x2022;</span>
              7 hard-coded policy checks
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-400 mt-0.5">&#x2022;</span>
              Value limits, whitelists, rate limits
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-400 mt-0.5">&#x2022;</span>
              Mint caps + Proof of Reserves
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-400 mt-0.5">&#x2022;</span>
              No AI can override policy
            </li>
          </ul>
        </div>

        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-2xl p-8">
          <div className="text-3xl mb-3">Layer 2</div>
          <h3 className="text-2xl font-bold text-yellow-400 mb-4">
            Behavioral Risk Scoring
          </h3>
          <ul className="space-y-3 text-gray-300 text-lg">
            <li className="flex items-start gap-2">
              <span className="text-yellow-400 mt-0.5">&#x2022;</span>
              7 anomaly dimensions per agent
            </li>
            <li className="flex items-start gap-2">
              <span className="text-yellow-400 mt-0.5">&#x2022;</span>
              Frozen origin baseline (can&apos;t poison)
            </li>
            <li className="flex items-start gap-2">
              <span className="text-yellow-400 mt-0.5">&#x2022;</span>
              Catches probing, drift, velocity
            </li>
            <li className="flex items-start gap-2">
              <span className="text-yellow-400 mt-0.5">&#x2022;</span>
              Defeats binary-search attacks
            </li>
          </ul>
        </div>

        <div className="bg-blue-500/10 border border-blue-500/30 rounded-2xl p-8">
          <div className="text-3xl mb-3">Layer 3</div>
          <h3 className="text-2xl font-bold text-blue-400 mb-4">
            Multi-AI Consensus
          </h3>
          <ul className="space-y-3 text-gray-300 text-lg">
            <li className="flex items-start gap-2">
              <span className="text-blue-400 mt-0.5">&#x2022;</span>
              Two independent AI models
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-400 mt-0.5">&#x2022;</span>
              Both must return APPROVED
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-400 mt-0.5">&#x2022;</span>
              CRE BFT consensus across DON
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-400 mt-0.5">&#x2022;</span>
              Confidential Compute (TEE)
            </li>
          </ul>
        </div>
      </div>

      <p className="text-center mt-10 text-xl text-gray-400">
        Even if AI is wrong, policy catches it. Even if policy is bypassed, behavioral scoring flags it.{' '}
        <span className="text-white font-semibold">
          No single point of failure.
        </span>
      </p>
    </SlideLayout>
  )
}
