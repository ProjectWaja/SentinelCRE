'use client'

import { useState } from 'react'

export default function CustomTransactionForm({
  disabled,
  onSimulate,
}: {
  disabled: boolean
  onSimulate: (to: string, input: string, value: string) => void
}) {
  const [customTo, setCustomTo] = useState('')
  const [customInput, setCustomInput] = useState('')
  const [customValue, setCustomValue] = useState('0')

  return (
    <details className="bg-gray-900 rounded-2xl border border-gray-800">
      <summary className="p-6 cursor-pointer text-sm font-bold uppercase tracking-wider text-gray-400 hover:text-gray-300 select-none">
        Custom Transaction
      </summary>
      <div className="px-6 pb-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="text-sm text-gray-500 uppercase tracking-wider font-semibold">To Address</label>
            <input
              type="text"
              value={customTo}
              onChange={(e) => setCustomTo(e.target.value)}
              placeholder="0x..."
              className="w-full mt-1 px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-base text-white placeholder-gray-600 focus:outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label className="text-sm text-gray-500 uppercase tracking-wider font-semibold">Calldata</label>
            <input
              type="text"
              value={customInput}
              onChange={(e) => setCustomInput(e.target.value)}
              placeholder="0x..."
              className="w-full mt-1 px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-base text-white placeholder-gray-600 focus:outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label className="text-sm text-gray-500 uppercase tracking-wider font-semibold">Value (wei)</label>
            <div className="flex gap-3 mt-1">
              <input
                type="text"
                value={customValue}
                onChange={(e) => setCustomValue(e.target.value)}
                placeholder="0"
                className="flex-1 px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-base text-white placeholder-gray-600 focus:outline-none focus:border-blue-500"
              />
              <button
                onClick={() => onSimulate(customTo, customInput, customValue)}
                disabled={disabled || !customTo}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 text-white text-base font-semibold rounded-xl transition-colors"
              >
                Simulate
              </button>
            </div>
          </div>
        </div>
      </div>
    </details>
  )
}
