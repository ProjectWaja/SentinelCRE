/**
 * SentinelCRE — Behavioral Analysis Engine (Layer 2)
 *
 * Seven anomaly dimensions computed inside the CRE workflow.
 * Pure functions — no async/await, no Date.now(), CRE SDK compatible.
 *
 * Dimensions:
 *   1. Value Deviation    (+[REDACTED]) — value > 2.5σ from historical mean
 *   2. Contract Diversity (+[REDACTED]) — first interaction with unknown contract
 *   3. Velocity Scoring   (+[REDACTED]) — action interval < 50% of expected
 *   4. Function Pattern   (+[REDACTED]) — unusual function signature for this agent
 *   5. Time-of-Day        (+[REDACTED]) — activity outside normal hours
 *   6. Sequential Probing (+[REDACTED]) — 3+ monotonically increasing values
 *   7. Cumulative Drift   (+[REDACTED]) — rolling avg drifted from frozen origin baseline
 *
 * Total possible: [REDACTED]. Default threshold: [REDACTED].
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

// ── Dimension 1: Value Deviation (+[REDACTED]) ───────────────────────────────

export function checkValueDeviation(
  currentValue: number,
  avgValue: number,
  stdDevValue: number,
): AnomalyDimension {
  const name = 'Value Deviation'
  const maxWeight = 0 /* REDACTED */

  if (avgValue === 0 && stdDevValue === 0) {
    return { name, score: 0, maxWeight, fired: false, reason: 'No baseline — first action' }
  }

  const effectiveStdDev = stdDevValue > 0 ? stdDevValue : avgValue * 0.25
  const zScore = effectiveStdDev > 0 ? Math.abs(currentValue - avgValue) / effectiveStdDev : 0

  if (zScore > 0 /* REDACTED */) {
    return {
      name,
      score: 0, /* REDACTED */
      maxWeight,
      fired: true,
      reason: `Value ${currentValue.toFixed(2)} ETH is ${zScore.toFixed(1)}σ from mean ${avgValue.toFixed(2)} ETH`,
    }
  }
  if (zScore > 0 /* REDACTED */) {
    return {
      name,
      score: 0, /* REDACTED */
      maxWeight,
      fired: true,
      reason: `Value ${currentValue.toFixed(2)} ETH is ${zScore.toFixed(1)}σ from mean (elevated)`,
    }
  }
  return {
    name,
    score: 0,
    maxWeight,
    fired: false,
    reason: `Value within normal range (${zScore.toFixed(1)}σ)`,
  }
}

// ── Dimension 2: Contract Diversity (+[REDACTED]) ────────────────────────────

export function checkContractDiversity(
  targetContract: string,
  knownContracts: string[],
): AnomalyDimension {
  const name = 'Contract Diversity'
  const maxWeight = 0 /* REDACTED */
  const target = targetContract.toLowerCase()

  if (knownContracts.length === 0) {
    return { name, score: 0, /* REDACTED */ maxWeight, fired: true, reason: 'New agent — no contract history yet' }
  }

  const known = knownContracts.some((c) => c.toLowerCase() === target)
  if (!known) {
    return {
      name,
      score: 0, /* REDACTED */
      maxWeight,
      fired: true,
      reason: `First interaction with contract ${target.slice(0, 10)}...`,
    }
  }

  return { name, score: 0, maxWeight, fired: false, reason: 'Known contract' }
}

// ── Dimension 3: Velocity Scoring (+[REDACTED]) ──────────────────────────────

export function checkVelocity(
  nowMs: number,
  lastActionTimestamp: number,
  minExpectedInterval: number,
): AnomalyDimension {
  const name = 'Velocity'
  const maxWeight = 0 /* REDACTED */

  if (lastActionTimestamp === 0) {
    return { name, score: 0, maxWeight, fired: false, reason: 'First action — no interval to compare' }
  }

  const interval = nowMs - lastActionTimestamp

  if (interval < minExpectedInterval * 0 /* REDACTED */) {
    return {
      name,
      score: 0, /* REDACTED */
      maxWeight,
      fired: true,
      reason: `Action ${(interval / 1000).toFixed(1)}s after previous (expected >= ${(minExpectedInterval / 1000).toFixed(0)}s)`,
    }
  }
  if (interval < minExpectedInterval * 0 /* REDACTED */) {
    return {
      name,
      score: 0, /* REDACTED */
      maxWeight,
      fired: true,
      reason: `Action interval ${(interval / 1000).toFixed(1)}s is below expected (elevated)`,
    }
  }

  return { name, score: 0, maxWeight, fired: false, reason: 'Normal action interval' }
}

// ── Dimension 4: Function Pattern (+[REDACTED]) ──────────────────────────────

export function checkFunctionPattern(
  functionSig: string,
  commonFunctions: string[],
): AnomalyDimension {
  const name = 'Function Pattern'
  const maxWeight = 0 /* REDACTED */

  if (commonFunctions.length === 0) {
    return { name, score: 0, maxWeight, fired: false, reason: 'New agent — no function history' }
  }

  const known = commonFunctions.some((f) => f.toLowerCase() === functionSig.toLowerCase())
  if (!known) {
    return {
      name,
      score: 0, /* REDACTED */
      maxWeight,
      fired: true,
      reason: `Unusual function ${functionSig} not in agent's common patterns`,
    }
  }

  return { name, score: 0, maxWeight, fired: false, reason: 'Known function signature' }
}

// ── Dimension 5: Time-of-Day (+[REDACTED]) ──────────────────────────────────

export function checkTimeOfDay(
  nowHourUTC: number,
  activeHours: number[],
): AnomalyDimension {
  const name = 'Time-of-Day'
  const maxWeight = 0 /* REDACTED */

  if (activeHours.length === 0 || activeHours.length === 24) {
    return { name, score: 0, maxWeight, fired: false, reason: 'Agent active all hours' }
  }

  if (!activeHours.includes(nowHourUTC)) {
    return {
      name,
      score: 0, /* REDACTED */
      maxWeight,
      fired: true,
      reason: `Action at ${nowHourUTC}:00 UTC outside normal window`,
    }
  }

  return { name, score: 0, maxWeight, fired: false, reason: 'Within active hours' }
}

// ── Dimension 6: Sequential Probing (+[REDACTED]) — the hero feature ─────────

export function checkSequentialProbing(
  recentValues: number[],
  currentValue: number,
): AnomalyDimension {
  const name = 'Sequential Probing'
  const maxWeight = 0 /* REDACTED */
  const values = [...recentValues, currentValue]

  if (values.length < 2) {
    return { name, score: 0, maxWeight, fired: false, reason: 'Insufficient history for pattern detection' }
  }

  if (values.length === 2) {
    if (values[1] > values[0]) {
      return {
        name,
        score: 0, /* REDACTED */
        maxWeight,
        fired: true,
        reason: `Two increasing values: [${values.map((v) => v.toFixed(1)).join(', ')}] — monitoring for pattern`,
      }
    }
    return { name, score: 0, maxWeight, fired: false, reason: 'No escalation pattern' }
  }

  // Check last 3-5 values for monotonically increasing
  const window = values.slice(-Math.min(values.length, 5))
  let monotonicallyIncreasing = true
  for (let i = 1; i < window.length; i++) {
    if (window[i] <= window[i - 1]) {
      monotonicallyIncreasing = false
      break
    }
  }

  if (monotonicallyIncreasing && window.length >= 3) {
    // Check for geometric progression (binary search pattern: each ~2x)
    const ratios: number[] = []
    let isGeometric = true
    for (let i = 1; i < window.length; i++) {
      const ratio = window[i] / window[i - 1]
      ratios.push(ratio)
      if (/* REDACTED ratio bounds */) {
        isGeometric = false
      }
    }

    const valuesStr = window.map((v) => v.toFixed(1)).join(', ')
    const reason = isGeometric
      ? `Binary search pattern: [${valuesStr}] (ratios: ${ratios.map((r) => r.toFixed(1)).join(', ')})`
      : `Monotonically increasing: [${valuesStr}] — sequential probing detected`

    return { name, score: 0, /* REDACTED */ maxWeight, fired: true, reason }
  }

  return { name, score: 0, maxWeight, fired: false, reason: 'No sequential escalation pattern' }
}

// ── Dimension 7: Cumulative Drift (+[REDACTED]) — the "boiling frog" defense ──

export function checkCumulativeDrift(
  currentAvgValue: number,
  originAvgValue: number,
  originStdDevValue: number,
  originFrozen: boolean,
): AnomalyDimension {
  const name = 'Cumulative Drift'
  const maxWeight = 0 /* REDACTED */

  // Can't detect drift until the origin baseline is frozen
  if (!originFrozen || originAvgValue === 0) {
    return { name, score: 0, maxWeight, fired: false, reason: 'Origin baseline not yet established' }
  }

  // How far has the rolling average drifted from the frozen origin?
  const effectiveOriginStdDev = originStdDevValue > 0 ? originStdDevValue : originAvgValue * 0.25
  const drift = Math.abs(currentAvgValue - originAvgValue)
  const driftRatio = effectiveOriginStdDev > 0 ? drift / effectiveOriginStdDev : 0
  const pctDrift = originAvgValue > 0 ? ((currentAvgValue - originAvgValue) / originAvgValue) * 100 : 0

  // Severe drift: rolling avg moved more than 3σ from origin
  if (driftRatio > 0 /* REDACTED */) {
    return {
      name,
      score: 0, /* REDACTED */
      maxWeight,
      fired: true,
      reason: `Rolling avg ${currentAvgValue.toFixed(2)} ETH drifted ${driftRatio.toFixed(1)}σ from origin ${originAvgValue.toFixed(2)} ETH (${pctDrift > 0 ? '+' : ''}${pctDrift.toFixed(0)}%)`,
    }
  }

  // Moderate drift: rolling avg moved more than 2σ from origin
  if (driftRatio > 0 /* REDACTED */) {
    return {
      name,
      score: 0, /* REDACTED */
      maxWeight,
      fired: true,
      reason: `Gradual drift detected: avg ${currentAvgValue.toFixed(2)} ETH vs origin ${originAvgValue.toFixed(2)} ETH (${pctDrift > 0 ? '+' : ''}${pctDrift.toFixed(0)}%)`,
    }
  }

  return {
    name,
    score: 0,
    maxWeight,
    fired: false,
    reason: `Stable — avg ${currentAvgValue.toFixed(2)} ETH near origin ${originAvgValue.toFixed(2)} ETH`,
  }
}

// ── Aggregator ───────────────────────────────────────────────────────

export function analyzeAll(
  proposal: { value: string; targetContract: string; functionSignature: string },
  context: BehaviorContext,
  nowMs: number,
  threshold: number = 0 /* REDACTED */,
): BehavioralAnalysisResult {
  // Convert wei to ETH for statistical analysis
  const currentValue = Number(BigInt(proposal.value || '0')) / 1e18
  const nowHour = Math.floor((nowMs / 3_600_000) % 24)

  const dimensions: AnomalyDimension[] = [
    checkValueDeviation(currentValue, context.avgValue, context.stdDevValue),
    checkContractDiversity(proposal.targetContract, context.knownContracts),
    checkVelocity(nowMs, context.lastActionTimestamp, context.minExpectedInterval),
    checkFunctionPattern(proposal.functionSignature, context.commonFunctions),
    checkTimeOfDay(nowHour, context.activeHours),
    checkSequentialProbing(context.recentValues, currentValue),
    checkCumulativeDrift(context.avgValue, context.originAvgValue, context.originStdDevValue, context.originFrozen),
  ]

  const totalScore = dimensions.reduce((sum, d) => sum + d.score, 0)

  return {
    totalScore,
    threshold,
    flagged: totalScore >= threshold,
    dimensions,
  }
}
