/**
 * Historical behavioral profile for an agent.
 * Maintained by the mock API server (in production: on-chain or Vault DON).
 */
export interface BehaviorProfile {
  /** Average transaction value in ETH */
  avgValue: number

  /** Standard deviation of transaction values */
  stdDevValue: number

  /** Known contract addresses (lowercase) */
  knownContracts: string[]

  /** Function signatures commonly used */
  commonFunctions: string[]

  /** Minimum expected interval between actions (ms) */
  minExpectedInterval: number

  /** Hours (UTC, 0-23) when agent is normally active */
  activeHours: number[]

  /** Recent transaction values in ETH for pattern detection */
  recentValues: number[]

  /** Timestamp of last recorded action (ms) */
  lastActionTimestamp: number

  /** Total approved actions */
  actionCount: number

  /** Running sum of values (for incremental avg calculation) */
  valueSum: number

  /** Running sum of squared values (for incremental stddev calculation) */
  valueSumSquares: number
}

/**
 * Default profile for newly registered agents.
 * Conservative — new agents start with no history.
 */
export function getDefaultProfile(): BehaviorProfile {
  return {
    avgValue: 0,
    stdDevValue: 0,
    knownContracts: [],
    commonFunctions: [],
    minExpectedInterval: 60_000,
    activeHours: Array.from({ length: 24 }, (_, i) => i),
    recentValues: [],
    lastActionTimestamp: 0,
    actionCount: 0,
    valueSum: 0,
    valueSumSquares: 0,
  }
}
