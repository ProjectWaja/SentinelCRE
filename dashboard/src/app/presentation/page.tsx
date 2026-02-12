'use client'

import { useState, useEffect, useCallback } from 'react'
import TitleSlide from '@/components/slides/TitleSlide'
import ProblemSlide from '@/components/slides/ProblemSlide'
import SolutionSlide from '@/components/slides/SolutionSlide'
import ArchitectureSlide from '@/components/slides/ArchitectureSlide'
import DemoScenario1Slide from '@/components/slides/DemoScenario1Slide'
import DemoScenario2Slide from '@/components/slides/DemoScenario2Slide'
import ChainlinkServicesSlide from '@/components/slides/ChainlinkServicesSlide'
import SmartContractsSlide from '@/components/slides/SmartContractsSlide'
import WhySentinelSlide from '@/components/slides/WhySentinelSlide'
import TeamSlide from '@/components/slides/TeamSlide'

const slides = [
  TitleSlide,
  ProblemSlide,
  SolutionSlide,
  ArchitectureSlide,
  DemoScenario1Slide,
  DemoScenario2Slide,
  ChainlinkServicesSlide,
  SmartContractsSlide,
  WhySentinelSlide,
  TeamSlide,
]

export default function PresentationPage() {
  const [current, setCurrent] = useState(0)

  const next = useCallback(() => {
    setCurrent((c) => Math.min(c + 1, slides.length - 1))
  }, [])

  const prev = useCallback(() => {
    setCurrent((c) => Math.max(c - 1, 0))
  }, [])

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      switch (e.key) {
        case 'ArrowRight':
        case ' ':
        case 'Enter':
          e.preventDefault()
          next()
          break
        case 'ArrowLeft':
        case 'Backspace':
          e.preventDefault()
          prev()
          break
        case 'Home':
          e.preventDefault()
          setCurrent(0)
          break
        case 'End':
          e.preventDefault()
          setCurrent(slides.length - 1)
          break
        default:
          if (e.key >= '1' && e.key <= '9') {
            const idx = parseInt(e.key) - 1
            if (idx < slides.length) setCurrent(idx)
          } else if (e.key === '0') {
            setCurrent(9)
          }
      }
    }

    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [next, prev])

  const Slide = slides[current]

  return (
    <div className="relative">
      <div className="transition-opacity duration-300">
        <Slide />
      </div>

      {/* Slide counter */}
      <div className="fixed bottom-6 right-8 flex items-center gap-4 z-50">
        <button
          onClick={prev}
          disabled={current === 0}
          className="text-gray-500 hover:text-white disabled:opacity-20 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <span className="text-sm text-gray-500 font-mono">
          {current + 1} / {slides.length}
        </span>
        <button
          onClick={next}
          disabled={current === slides.length - 1}
          className="text-gray-500 hover:text-white disabled:opacity-20 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* Progress bar */}
      <div className="fixed bottom-0 left-0 right-0 h-1 bg-gray-900 z-50">
        <div
          className="h-full bg-gradient-to-r from-red-600 to-orange-500 transition-all duration-300"
          style={{ width: `${((current + 1) / slides.length) * 100}%` }}
        />
      </div>

      {/* Home link */}
      <a
        href="/"
        className="fixed top-6 right-8 text-xs text-gray-600 hover:text-gray-300 transition-colors z-50"
      >
        Dashboard &rarr;
      </a>
    </div>
  )
}
