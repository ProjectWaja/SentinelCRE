import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'SentinelCRE — AI Guardian Protocol',
  description:
    'Decentralized AI sentinel guardian for Web3 — multi-AI consensus, policy enforcement, and circuit breakers.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="bg-gray-950 text-gray-100 min-h-screen antialiased">
        <nav className="border-b border-gray-800 bg-gray-950/80 backdrop-blur-sm sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-red-600 to-orange-500 flex items-center justify-center animate-shield">
                <svg
                  className="w-5 h-5 text-white"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 1.944A11.954 11.954 0 012.166 5C2.056 5.649 2 6.319 2 7c0 5.225 3.34 9.67 8 11.317C14.66 16.67 18 12.225 18 7c0-.682-.057-1.35-.166-2.001A11.954 11.954 0 0110 1.944zM11 14a1 1 0 11-2 0 1 1 0 012 0zm0-7a1 1 0 10-2 0v3a1 1 0 102 0V7z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div>
                <h1 className="text-lg font-bold text-white tracking-tight">
                  SentinelCRE
                </h1>
                <p className="text-xs text-gray-500 -mt-0.5">
                  AI Guardian Protocol
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <a
                href="/presentation"
                className="text-sm text-gray-400 hover:text-white transition-colors"
              >
                Presentation
              </a>
              <span className="text-xs text-purple-400 bg-purple-400/10 px-2.5 py-1 rounded-full">
                Tenderly TestNet
              </span>
            </div>
          </div>
        </nav>
        <main>{children}</main>
      </body>
    </html>
  )
}
