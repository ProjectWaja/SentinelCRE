'use client'

import SlideLayout from './SlideLayout'

const steps = [
  { num: '1', label: 'AI Agent', desc: 'Proposes action', color: 'text-red-400', bg: 'bg-red-400/10', border: 'border-red-400/30' },
  { num: '2', label: 'CRE Trigger', desc: 'Receives proposal', color: 'text-blue-400', bg: 'bg-blue-400/10', border: 'border-blue-400/30' },
  { num: '3', label: 'EVMClient', desc: 'Read policy', color: 'text-cyan-400', bg: 'bg-cyan-400/10', border: 'border-cyan-400/30' },
  { num: '4', label: 'AI Models', desc: '2-model consensus', color: 'text-purple-400', bg: 'bg-purple-400/10', border: 'border-purple-400/30' },
  { num: '5', label: 'Consensus', desc: 'Both must approve', color: 'text-yellow-400', bg: 'bg-yellow-400/10', border: 'border-yellow-400/30' },
  { num: '6', label: 'On-Chain', desc: 'Policy enforcement', color: 'text-green-400', bg: 'bg-green-400/10', border: 'border-green-400/30' },
]

export default function ArchitectureSlide() {
  return (
    <SlideLayout>
      <h2 className="text-4xl font-bold text-white mb-2">Architecture</h2>
      <p className="text-xl text-gray-400 mb-10">Verdict Pipeline</p>

      <div className="flex items-center justify-between gap-2 mb-10">
        {steps.map((step, i) => (
          <div key={step.num} className="flex items-center gap-2">
            <div className={`${step.bg} border ${step.border} rounded-xl p-4 text-center min-w-[120px]`}>
              <div className={`text-xs ${step.color} mb-1`}>Step {step.num}</div>
              <div className="text-white font-semibold text-sm">{step.label}</div>
              <div className="text-xs text-gray-500 mt-1">{step.desc}</div>
            </div>
            {i < steps.length - 1 && (
              <span className="text-gray-600 text-lg">&rarr;</span>
            )}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-5">
          <h3 className="text-green-400 font-semibold mb-2">APPROVED Path</h3>
          <p className="text-sm text-gray-300">
            Action forwarded to target contract. Stats updated, rate limit window tracked, daily volume recorded.
          </p>
        </div>
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-5">
          <h3 className="text-red-400 font-semibold mb-2">DENIED Path</h3>
          <p className="text-sm text-gray-300">
            Circuit breaker fires. Agent frozen instantly. Incident logged immutably. Admin-only recovery.
          </p>
        </div>
      </div>
    </SlideLayout>
  )
}
