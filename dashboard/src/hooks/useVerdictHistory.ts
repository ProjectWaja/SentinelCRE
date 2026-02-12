'use client'

import { useState, useCallback } from 'react'
import type { VerdictResult } from '@/lib/demo-scenarios'

export interface VerdictEntry extends VerdictResult {
  id: string
}

const MAX_ENTRIES = 50

export function useVerdictHistory() {
  const [verdicts, setVerdicts] = useState<VerdictEntry[]>([])

  const addVerdict = useCallback((result: VerdictResult) => {
    const entry: VerdictEntry = {
      ...result,
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    }
    setVerdicts((prev) => [entry, ...prev].slice(0, MAX_ENTRIES))
  }, [])

  const clearVerdicts = useCallback(() => {
    setVerdicts([])
  }, [])

  return { verdicts, addVerdict, clearVerdicts }
}
