'use client'

import SlideLayout from './SlideLayout'

export default function SolutionSlide() {
  return (
    <SlideLayout dark={false}>
      <h2 className="text-4xl font-bold text-white mb-2">The Solution</h2>
      <p className="text-xl text-green-400 mb-10">Two-Layer Defense</p>

      <div className="grid grid-cols-2 gap-8">
        <div className="bg-blue-500/10 border border-blue-500/30 rounded-2xl p-8">
          <div className="text-3xl mb-3">Layer 1</div>
          <h3 className="text-2xl font-bold text-blue-400 mb-3">
            AI Consensus
          </h3>
          <ul className="space-y-2 text-gray-300">
            <li className="flex items-start gap-2">
              <span className="text-blue-400 mt-1">&#x2022;</span>
              Two independent AI models evaluate every action
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-400 mt-1">&#x2022;</span>
              Both must return APPROVED
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-400 mt-1">&#x2022;</span>
              CRE BFT consensus across DON nodes
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-400 mt-1">&#x2022;</span>
              Default to DENY on any error
            </li>
          </ul>
        </div>

        <div className="bg-green-500/10 border border-green-500/30 rounded-2xl p-8">
          <div className="text-3xl mb-3">Layer 2</div>
          <h3 className="text-2xl font-bold text-green-400 mb-3">
            On-Chain Policy
          </h3>
          <ul className="space-y-2 text-gray-300">
            <li className="flex items-start gap-2">
              <span className="text-green-400 mt-1">&#x2022;</span>
              Immutable smart contract guardrails
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-400 mt-1">&#x2022;</span>
              Value limits, whitelists, rate limits, mint caps
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-400 mt-1">&#x2022;</span>
              No AI can override policy
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-400 mt-1">&#x2022;</span>
              Circuit breaker freezes agent instantly
            </li>
          </ul>
        </div>
      </div>

      <p className="text-center mt-10 text-lg text-gray-400">
        Even if AI is wrong, policy catches it.{' '}
        <span className="text-white font-semibold">
          No single point of failure.
        </span>
      </p>
    </SlideLayout>
  )
}
