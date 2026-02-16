/**
 * Agent-specific policy configuration.
 * Stored encrypted in Vault DON / CRE secrets.
 * The agent NEVER sees these values.
 */
export interface AgentPolicy {
  /** Maximum value per single transaction (wei) */
  maxTransactionValue: string

  /** Maximum cumulative value per 24h (wei) */
  maxDailyVolume: string

  /** Maximum tokens per mint */
  maxMintAmount: string

  /** Maximum number of actions per time window */
  rateLimit: number

  /** Time window duration in seconds */
  rateLimitWindow: number

  /** Whitelist of approved target contract addresses (lowercase) */
  approvedContracts: string[]

  /** Blacklisted function signatures (bytes4 hex) */
  blockedFunctions: string[]

  /** Require dual-AI consensus */
  requireMultiAiConsensus: boolean

  /** Policy active flag */
  isActive: boolean

  /** Anomaly score threshold that triggers denial (0-100) */
  anomalyScoreThreshold: number
}

export interface PolicyViolation {
  type:
    | 'VALUE_EXCEEDED'
    | 'UNAPPROVED_CONTRACT'
    | 'BLACKLISTED_FUNCTION'
    | 'RATE_LIMIT_EXCEEDED'
    | 'CUMULATIVE_VALUE_EXCEEDED'
    | 'MINT_CAP_EXCEEDED'

  detail: string

  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
}

export interface PolicyResult {
  passed: boolean
  violations: PolicyViolation[]
}
