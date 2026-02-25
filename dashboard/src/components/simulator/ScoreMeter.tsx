'use client'

import { useEffect, useRef, useState } from 'react'

interface ScoreMeterProps {
  score: number
  maxScore?: number
}

function getStatusLabel(score: number): string {
  if (score >= 70) return 'LOCKOUT'
  if (score >= 50) return 'FLAGGED'
  if (score >= 25) return 'ELEVATED'
  return 'NORMAL'
}

function getStatusColor(score: number): string {
  if (score >= 70) return 'text-red-400'
  if (score >= 50) return 'text-orange-400'
  if (score >= 25) return 'text-yellow-400'
  return 'text-green-400'
}

function getStatusBg(score: number): string {
  if (score >= 70) return 'bg-red-400/10'
  if (score >= 50) return 'bg-orange-400/10'
  if (score >= 25) return 'bg-yellow-400/10'
  return 'bg-green-400/10'
}

function getScoreNumberColor(score: number): string {
  if (score >= 70) return 'text-red-400'
  if (score >= 50) return 'text-orange-400'
  if (score >= 25) return 'text-yellow-300'
  return 'text-green-400'
}

export default function ScoreMeter({ score, maxScore = 100 }: ScoreMeterProps) {
  const [isAnimating, setIsAnimating] = useState(false)
  const prevScoreRef = useRef(score)

  // Detect score changes and trigger pulse animation
  useEffect(() => {
    if (prevScoreRef.current !== score) {
      setIsAnimating(true)
      prevScoreRef.current = score
      const timeout = setTimeout(() => setIsAnimating(false), 800)
      return () => clearTimeout(timeout)
    }
  }, [score])

  const percentage = Math.min((score / maxScore) * 100, 100)
  const thresholdPosition = (50 / maxScore) * 100
  const status = getStatusLabel(score)
  const isLockout = score >= 70

  return (
    <div
      className={`relative rounded-2xl border p-6 transition-all duration-500 ${
        isLockout
          ? 'border-red-500/70 bg-red-950/30 shadow-[0_0_30px_rgba(239,68,68,0.3)] animate-lockout-glow'
          : 'border-gray-700/50 bg-gray-900/80'
      }`}
    >
      {/* Score Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <h3 className="text-2xl font-bold text-gray-200">Behavioral Risk Score</h3>
          <span
            className={`px-3 py-1 rounded-full text-lg font-bold ${getStatusColor(score)} ${getStatusBg(score)}`}
          >
            {status}
          </span>
        </div>

        {/* Large score number */}
        <div
          className={`transition-all duration-300 ${
            isAnimating ? 'scale-125' : 'scale-100'
          }`}
        >
          <span
            className={`text-5xl font-black tabular-nums ${getScoreNumberColor(score)} ${
              isAnimating ? 'animate-score-pulse' : ''
            }`}
          >
            {score}
          </span>
          <span className="text-xl text-gray-500 font-semibold ml-1">
            /{maxScore}
          </span>
        </div>
      </div>

      {/* Gradient Bar */}
      <div className="relative h-8 rounded-full overflow-hidden bg-gray-800/80 border border-gray-700/50">
        {/* Static gradient background showing the full spectrum */}
        <div
          className="absolute inset-0 rounded-full opacity-20"
          style={{
            background:
              'linear-gradient(to right, #22c55e 0%, #22c55e 24%, #eab308 25%, #eab308 49%, #f97316 50%, #f97316 69%, #ef4444 70%, #ef4444 100%)',
          }}
        />

        {/* Active fill bar */}
        <div
          className="absolute inset-y-0 left-0 rounded-full transition-all duration-700 ease-out"
          style={{
            width: `${percentage}%`,
            background:
              score >= 70
                ? 'linear-gradient(to right, #22c55e, #eab308, #f97316, #ef4444)'
                : score >= 50
                  ? 'linear-gradient(to right, #22c55e, #eab308, #f97316)'
                  : score >= 25
                    ? 'linear-gradient(to right, #22c55e, #eab308)'
                    : '#22c55e',
            boxShadow: isAnimating
              ? score >= 70
                ? '0 0 20px rgba(239, 68, 68, 0.6)'
                : score >= 50
                  ? '0 0 15px rgba(249, 115, 22, 0.5)'
                  : '0 0 10px rgba(234, 179, 8, 0.4)'
              : 'none',
          }}
        />

        {/* Threshold marker at 50 */}
        <div
          className="absolute top-0 bottom-0 w-0.5 z-10"
          style={{ left: `${thresholdPosition}%` }}
        >
          <div className="w-full h-full border-l-2 border-dashed border-white/40" />
        </div>
      </div>

      {/* Scale labels */}
      <div className="flex justify-between mt-2 text-lg font-semibold">
        <span className="text-green-500">0</span>
        <span className="text-yellow-500">25</span>
        <span className="text-white/50 relative" style={{ left: '0%' }}>
          50 (threshold)
        </span>
        <span className="text-orange-500">70</span>
        <span className="text-red-500">{maxScore}</span>
      </div>

    </div>
  )
}
