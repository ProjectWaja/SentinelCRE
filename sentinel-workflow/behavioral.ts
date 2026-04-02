/**
 * SentinelCRE — Behavioral Analysis Engine (Layer 2)
 *
 * Multi-dimension anomaly scoring computed inside the CRE workflow.
 * Pure functions — no async/await, no Date.now(), CRE SDK compatible.
 *
 * The behavioral scoring engine analyzes agent transaction patterns
 * across multiple anomaly dimensions to detect threats including:
 *   - Value anomalies relative to historical baselines
 *   - Interactions with unknown contracts
 *   - Abnormal transaction velocity
 *   - Unusual function call patterns
 *   - Off-hours activity
 *   - Sequential probing / threshold discovery attempts
 *   - Gradual behavioral drift from frozen origin baseline
 *
 * Scoring weights, thresholds, and detection parameters are proprietary.
 * Contact: sentinelcre.ai | @ProjectWaja
 *
 * NOTE: This is the public hackathon submission. The production behavioral
 * engine with calibrated weights and detection logic lives in a private repository.
 */

// ── Types ────────────────────────────────────────────────────────────

export interface BehaviorContext {
  /** Last N transaction values in ETH (float) */
  recentValues: number[]
  /** Last N action timestamps (ms since epoch) */
  recentTimestamps: number[]
  /** Contracts this agent has interacted with (lowercase) */
  knownContracts: string[]
  /** Function sigs this agent commonly uses (bytes4 hex) */
  commonFunctions: string[]
  /** Hours (UTC, 0-23) when agent is normally active */
  activeHours: number[]
  /** Historical average transaction value (ETH) */
  avgValue: number
  /** Historical standard deviation of transaction values */
  stdDevValue: number
  /** Timestamp of the most recent prior action (ms) */
  lastActionTimestamp: number
  /** Minimum expected interval between actions (ms) */
  minExpectedInterval: number
  /** Frozen origin baseline avg (set after first N actions, never updated) */
  originAvgValue: number
  /** Frozen origin baseline stddev */
  originStdDevValue: number
  /** Whether the origin baseline has been frozen */
  originFrozen: boolean
}

export interface AnomalyDimension {
  name: string
  score: number
  maxWeight: number
  fired: boolean
  reason: string
}

export interface BehavioralAnalysisResult {
  totalScore: number
  threshold: number
  flagged: boolean
  dimensions: AnomalyDimension[]
}

// ── Default Context ──────────────────────────────────────────────────

export function getDefaultContext(): BehaviorContext {
  return {
    recentValues: [],
    recentTimestamps: [],
    knownContracts: [],
    commonFunctions: [],
    activeHours: Array.from({ length: 24 }, (_, i) => i),
    avgValue: 0,
    stdDevValue: 0,
    lastActionTimestamp: 0,
    minExpectedInterval: 60_000,
    originAvgValue: 0,
    originStdDevValue: 0,
    originFrozen: false,
  }
}

// ── Scoring Functions ────────────────────────────────────────────────
//
// Individual dimension check functions and the analyzeAll aggregator
// have been removed from this public repository.
//
// The production engine evaluates each dimension using calibrated
// weights and statistical methods. The interface contracts above
// remain stable across public and private implementations.
//
// For integration inquiries: sentinelcre.ai
// ─────────────────────────────────────────────────────────────────────

export function analyzeAll(
  proposal: { value: string; targetContract: string; functionSignature: string },
  context: BehaviorContext,
  nowMs: number,
  threshold?: number,
): BehavioralAnalysisResult {
  // Production scoring logic is proprietary.
  // This stub returns a safe default for build compatibility.
  return {
    totalScore: 0,
    threshold: threshold ?? 0,
    flagged: false,
    dimensions: [],
  }
}
