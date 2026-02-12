'use client'

import SlideLayout from './SlideLayout'

export default function TeamSlide() {
  return (
    <SlideLayout>
      <div className="text-center">
        <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-red-600 to-orange-500 flex items-center justify-center">
          <svg className="w-12 h-12 text-white" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M10 1.944A11.954 11.954 0 012.166 5C2.056 5.649 2 6.319 2 7c0 5.225 3.34 9.67 8 11.317C14.66 16.67 18 12.225 18 7c0-.682-.057-1.35-.166-2.001A11.954 11.954 0 0110 1.944z"
              clipRule="evenodd"
            />
          </svg>
        </div>

        <h2 className="text-4xl font-bold text-white mb-2">SentinelCRE</h2>
        <p className="text-xl text-gray-400 mb-10">
          The sentinel guardian watches, so you don&apos;t have to.
        </p>

        <div className="bg-gray-800/50 rounded-xl p-8 border border-gray-700/50 max-w-lg mx-auto mb-10">
          <h3 className="text-2xl font-bold text-white mb-1">Willis</h3>
          <p className="text-gray-400 mb-3">
            @ProjectWaja | Blockchain Musketeers
          </p>
        </div>

        <div className="flex items-center justify-center gap-8 text-sm">
          <a
            href="https://github.com/ProjectWaja/SentinelCRE"
            className="text-blue-400 hover:text-blue-300 transition-colors"
          >
            GitHub Repo
          </a>
          <span className="text-gray-600">|</span>
          <span className="text-gray-400">
            Tenderly Virtual TestNet (Sepolia)
          </span>
        </div>

        <div className="mt-8 flex items-center justify-center gap-4 text-xs text-gray-600">
          <span>Solidity 0.8.24</span>
          <span>&#x2022;</span>
          <span>Next.js 15</span>
          <span>&#x2022;</span>
          <span>CRE SDK</span>
          <span>&#x2022;</span>
          <span>61 Tests</span>
          <span>&#x2022;</span>
          <span>OpenZeppelin v5.5</span>
        </div>
      </div>
    </SlideLayout>
  )
}
