'use client'

import { useRef, useState, useEffect, useCallback } from 'react'

interface Tab {
  id: string
  label: string
  desc: string
  icon: React.ReactNode
}

const TABS: Tab[] = [
  {
    id: 'architecture',
    label: 'Architecture',
    desc: '3-layer defense',
    icon: (
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
        <path d="M7 3a1 1 0 000 2h6a1 1 0 100-2H7zM4 7a1 1 0 011-1h10a1 1 0 110 2H5a1 1 0 01-1-1zM2 11a2 2 0 012-2h12a2 2 0 012 2v4a2 2 0 01-2 2H4a2 2 0 01-2-2v-4z" />
      </svg>
    ),
  },
  {
    id: 'demo',
    label: 'Live Demo',
    desc: '14 attack scenarios',
    icon: (
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
        <path
          fillRule="evenodd"
          d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z"
          clipRule="evenodd"
        />
      </svg>
    ),
  },
  {
    id: 'guardian',
    label: 'Guardian',
    desc: 'Agent monitoring',
    icon: (
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
        <path
          fillRule="evenodd"
          d="M10 1.944A11.954 11.954 0 012.166 5C2.056 5.649 2 6.319 2 7c0 5.225 3.34 9.67 8 11.317C14.66 16.67 18 12.225 18 7c0-.682-.057-1.35-.166-2.001A11.954 11.954 0 0110 1.944z"
          clipRule="evenodd"
        />
      </svg>
    ),
  },
  {
    id: 'simulator',
    label: 'Simulator',
    desc: 'Training ground',
    icon: (
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
        <path
          fillRule="evenodd"
          d="M7 2a1 1 0 00-.707 1.707L7 4.414v3.758a1 1 0 01-.293.707l-4 4C.817 14.769 2.156 18 4.828 18h10.343c2.673 0 4.012-3.231 2.122-5.121l-4-4A1 1 0 0113 8.172V4.414l.707-.707A1 1 0 0013 2H7zm2 6.172V4h2v4.172a3 3 0 00.879 2.12l1.027 1.028a4 4 0 00-2.171.102l-.47.156a4 4 0 01-2.53 0l-.563-.187a1.993 1.993 0 00-.114-.035l1.063-1.063A3 3 0 009 8.172z"
          clipRule="evenodd"
        />
      </svg>
    ),
  },
]

export default function TabNavigation({
  activeTab,
  onTabChange,
}: {
  activeTab: string
  onTabChange: (tab: string) => void
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const tabRefs = useRef<Map<string, HTMLButtonElement>>(new Map())
  const [indicatorStyle, setIndicatorStyle] = useState({ left: 0, width: 0 })

  const updateIndicator = useCallback(() => {
    const button = tabRefs.current.get(activeTab)
    const container = containerRef.current
    if (!button || !container) return

    const containerRect = container.getBoundingClientRect()
    const buttonRect = button.getBoundingClientRect()

    setIndicatorStyle({
      left: buttonRect.left - containerRect.left,
      width: buttonRect.width,
    })
  }, [activeTab])

  useEffect(() => {
    updateIndicator()
    window.addEventListener('resize', updateIndicator)
    return () => window.removeEventListener('resize', updateIndicator)
  }, [updateIndicator])

  return (
    <div className="sticky top-20 z-40 bg-gray-950/80 backdrop-blur-sm border-b border-gray-800">
      <div className="w-full px-6 xl:px-10">
        <div ref={containerRef} className="relative flex gap-1">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              ref={(el) => {
                if (el) tabRefs.current.set(tab.id, el)
              }}
              onClick={() => onTabChange(tab.id)}
              className={`flex items-center gap-2.5 px-5 py-3.5 text-lg font-semibold transition-colors duration-200 relative ${
                activeTab === tab.id
                  ? 'text-red-400'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/40'
              } rounded-t-lg`}
            >
              <span className={`w-5 h-5 transition-transform duration-200 ${
                activeTab === tab.id ? 'scale-110' : ''
              }`}>
                {tab.icon}
              </span>
              {tab.label}
              <span className={`text-sm font-normal transition-colors duration-200 ${
                activeTab === tab.id ? 'text-red-400/50' : 'text-gray-600'
              }`}>
                {tab.desc}
              </span>
            </button>
          ))}
          {/* Animated sliding indicator */}
          <div
            className="absolute bottom-0 h-[2px] bg-red-500 rounded-full transition-all duration-300 ease-out"
            style={{
              left: indicatorStyle.left,
              width: indicatorStyle.width,
            }}
          />
        </div>
      </div>
    </div>
  )
}
