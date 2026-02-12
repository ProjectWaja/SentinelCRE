'use client'

export default function SlideLayout({
  children,
  dark = true,
}: {
  children: React.ReactNode
  dark?: boolean
}) {
  return (
    <div
      className={`min-h-screen flex flex-col items-center justify-center p-12 ${
        dark ? 'bg-gray-950' : 'bg-gray-900'
      }`}
    >
      <div className="max-w-5xl w-full">{children}</div>
      <div className="absolute top-6 left-8 flex items-center gap-2 opacity-40">
        <div className="w-6 h-6 rounded bg-gradient-to-br from-red-600 to-orange-500 flex items-center justify-center">
          <svg className="w-3.5 h-3.5 text-white" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M10 1.944A11.954 11.954 0 012.166 5C2.056 5.649 2 6.319 2 7c0 5.225 3.34 9.67 8 11.317C14.66 16.67 18 12.225 18 7c0-.682-.057-1.35-.166-2.001A11.954 11.954 0 0110 1.944z"
              clipRule="evenodd"
            />
          </svg>
        </div>
        <span className="text-xs font-semibold text-white">SentinelCRE</span>
      </div>
    </div>
  )
}
