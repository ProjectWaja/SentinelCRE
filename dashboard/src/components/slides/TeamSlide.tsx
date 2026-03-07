'use client'

import SlideLayout from './SlideLayout'

export default function TeamSlide() {
  return (
    <SlideLayout>
      <div className="text-center">
        <div className="w-28 h-28 mx-auto mb-8 rounded-2xl bg-gradient-to-br from-red-600 to-orange-500 flex items-center justify-center">
          <svg className="w-16 h-16 text-white" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M10 1.944A11.954 11.954 0 012.166 5C2.056 5.649 2 6.319 2 7c0 5.225 3.34 9.67 8 11.317C14.66 16.67 18 12.225 18 7c0-.682-.057-1.35-.166-2.001A11.954 11.954 0 0110 1.944z"
              clipRule="evenodd"
            />
          </svg>
        </div>

        <h2 className="text-6xl font-bold text-white mb-3">SentinelCRE</h2>
        <p className="text-2xl text-gray-400 mb-12">
          The sentinel guardian watches, so you don&apos;t have to.
        </p>

        <div className="bg-gray-800/50 rounded-xl p-10 border border-gray-700/50 max-w-xl mx-auto mb-12">
          <h3 className="text-3xl font-bold text-white mb-2">Willis Tang</h3>
          <p className="text-xl text-gray-400 mb-1">
            @ProjectWaja | Project Waja
          </p>
        </div>

        <div className="flex items-center justify-center gap-8 text-lg mb-6">
          <a
            href="https://github.com/ProjectWaja/SentinelCRE"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-400 hover:text-blue-300 transition-colors"
          >
            GitHub Repo
          </a>
          <span className="text-gray-600">|</span>
          <a
            href="https://dashboard-dun-alpha-96.vercel.app"
            target="_blank"
            rel="noopener noreferrer"
            className="text-green-400 hover:text-green-300 transition-colors"
          >
            Live Dashboard
          </a>
          <span className="text-gray-600">|</span>
          <a
            href="https://dashboard.tenderly.co/project-waja/sentinelcre/testnet/9c734d91-b707-484a-a7be-db55b67eac02"
            target="_blank"
            rel="noopener noreferrer"
            className="text-purple-400 hover:text-purple-300 transition-colors"
          >
            Tenderly Virtual TestNet
          </a>
        </div>

        <div className="mt-8 flex items-center justify-center gap-4 text-sm text-gray-600">
          <span>Solidity 0.8.24</span>
          <span>&#x2022;</span>
          <span>Next.js 15</span>
          <span>&#x2022;</span>
          <span>CRE SDK v1.0.9</span>
          <span>&#x2022;</span>
          <span>90 Tests</span>
          <span>&#x2022;</span>
          <span>OpenZeppelin v5.5</span>
        </div>
      </div>
    </SlideLayout>
  )
}
