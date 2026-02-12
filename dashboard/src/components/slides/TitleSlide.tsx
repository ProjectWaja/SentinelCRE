'use client'

import SlideLayout from './SlideLayout'

export default function TitleSlide() {
  return (
    <SlideLayout>
      <div className="text-center">
        <div className="w-24 h-24 mx-auto mb-8 rounded-2xl bg-gradient-to-br from-red-600 to-orange-500 flex items-center justify-center animate-shield">
          <svg className="w-14 h-14 text-white" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M10 1.944A11.954 11.954 0 012.166 5C2.056 5.649 2 6.319 2 7c0 5.225 3.34 9.67 8 11.317C14.66 16.67 18 12.225 18 7c0-.682-.057-1.35-.166-2.001A11.954 11.954 0 0110 1.944zM11 14a1 1 0 11-2 0 1 1 0 012 0zm0-7a1 1 0 10-2 0v3a1 1 0 102 0V7z"
              clipRule="evenodd"
            />
          </svg>
        </div>
        <h1 className="text-6xl font-bold text-white mb-4">SentinelCRE</h1>
        <p className="text-2xl text-gray-300 mb-8">
          Decentralized AI Guardian Protocol for Web3
        </p>
        <div className="flex items-center justify-center gap-6 text-sm">
          <span className="text-purple-400 bg-purple-400/10 px-4 py-2 rounded-full">
            Chainlink Convergence Hackathon
          </span>
          <span className="text-gray-400">Feb 2026</span>
        </div>
        <div className="flex items-center justify-center gap-4 mt-4 text-xs text-gray-500">
          <span className="bg-blue-400/10 text-blue-400 px-3 py-1 rounded-full">
            AI + Web3
          </span>
          <span className="bg-orange-400/10 text-orange-400 px-3 py-1 rounded-full">
            Privacy / Confidential Compute
          </span>
        </div>
      </div>
    </SlideLayout>
  )
}
