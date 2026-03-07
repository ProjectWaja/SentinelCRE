'use client'

import SlideLayout from './SlideLayout'

const steps = [
  { num: '1', label: 'HTTP Trigger', desc: 'Receives proposal', color: 'text-blue-400', bg: 'bg-blue-400/10', border: 'border-blue-400/30' },
  { num: '2', label: 'EVMClient', desc: 'Read agent policy', color: 'text-cyan-400', bg: 'bg-cyan-400/10', border: 'border-cyan-400/30' },
  { num: '3', label: 'Policy Check', desc: '7 compliance checks', color: 'text-green-400', bg: 'bg-green-400/10', border: 'border-green-400/30' },
  { num: '4', label: 'Behavioral', desc: '7 anomaly dimensions', color: 'text-yellow-400', bg: 'bg-yellow-400/10', border: 'border-yellow-400/30' },
  { num: '5', label: 'AI Model 1', desc: 'Claude evaluation', color: 'text-purple-400', bg: 'bg-purple-400/10', border: 'border-purple-400/30' },
  { num: '6', label: 'AI Model 2', desc: 'GPT-4 evaluation', color: 'text-purple-400', bg: 'bg-purple-400/10', border: 'border-purple-400/30' },
  { num: '7', label: 'Consensus', desc: 'Both must approve', color: 'text-orange-400', bg: 'bg-orange-400/10', border: 'border-orange-400/30' },
  { num: '8', label: 'On-Chain', desc: 'Write verdict', color: 'text-red-400', bg: 'bg-red-400/10', border: 'border-red-400/30' },
]

export default function ArchitectureSlide() {
  return (
    <SlideLayout>
      <h2 className="text-5xl font-bold text-white mb-3">Architecture</h2>
      <p className="text-2xl text-gray-400 mb-10">8-Step Verdict Pipeline</p>

      <div className="flex items-center justify-between gap-2 mb-10">
        {steps.map((step, i) => (
          <div key={step.num} className="flex items-center gap-2">
            <div className={`${step.bg} border ${step.border} rounded-xl p-4 text-center min-w-[120px]`}>
              <div className={`text-sm ${step.color} mb-1`}>Step {step.num}</div>
              <div className="text-white font-semibold text-base">{step.label}</div>
              <div className="text-sm text-gray-400 mt-1">{step.desc}</div>
            </div>
            {i < steps.length - 1 && (
              <span className="text-gray-600 text-lg">&rarr;</span>
            )}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-8">
        <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-8">
          <h3 className="text-green-400 font-semibold text-xl mb-3">APPROVED Path</h3>
          <p className="text-lg text-gray-300">
            Action forwarded to target contract. Stats updated, rate limit window tracked, daily volume recorded. Full audit trail on-chain via Tenderly Virtual TestNet.
          </p>
        </div>
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-8">
          <h3 className="text-red-400 font-semibold text-xl mb-3">DENIED Path</h3>
          <p className="text-lg text-gray-300">
            Circuit breaker fires. Agent frozen on-chain. Incident logged immutably. Severity classified — appeal window for non-critical denials.
          </p>
        </div>
      </div>
    </SlideLayout>
  )
}
