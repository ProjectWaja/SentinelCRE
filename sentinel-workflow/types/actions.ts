/**
 * Proposed on-chain action from an AI agent.
 * Input to the SentinelCRE evaluation pipeline.
 */
export interface ProposedAction {
  /** Registered agent ID in SentinelGuardian (bytes32 hex) */
  agentId: string

  /** Target contract address */
  targetContract: string

  /** Function signature (bytes4 hex, e.g. "0x38ed1739") */
  functionSignature: string

  /** Transaction value in wei (as string for BigInt) */
  value: string

  /** Mint amount in token units (as string for BigInt) */
  mintAmount: string

  /** ABI-encoded function calldata */
  calldata: string

  /** Human-readable action description */
  description: string

  /** Recent transaction values in ETH for behavioral analysis */
  recentValues?: number[]

  /** Recent action timestamps in ms for velocity scoring */
  recentTimestamps?: number[]
}

export type ActionType =
  | 'SWAP'
  | 'TRANSFER'
  | 'SUPPLY'
  | 'BORROW'
  | 'WITHDRAW'
  | 'APPROVE'
  | 'MINT'
  | 'CUSTOM'
  | 'UNKNOWN'

/** Infer action type from function signature for behavioral profiling. */
export function inferActionType(functionSig: string): ActionType {
  const sig = functionSig.toLowerCase()
  if (sig.includes('swap') || sig === '0x38ed1739') return 'SWAP'
  if (sig.includes('transfer')) return 'TRANSFER'
  if (sig.includes('supply') || sig.includes('deposit')) return 'SUPPLY'
  if (sig.includes('borrow')) return 'BORROW'
  if (sig.includes('withdraw')) return 'WITHDRAW'
  if (sig.includes('approve') || sig === '0x095ea7b3') return 'APPROVE'
  if (sig.includes('mint') || sig === '0x40c10f19') return 'MINT'
  return 'UNKNOWN'
}
