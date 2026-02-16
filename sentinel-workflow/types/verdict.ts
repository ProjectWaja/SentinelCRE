import type { PolicyResult } from './policy'
import type { BehavioralAnalysisResult } from '../behavioral'

/**
 * Individual AI model evaluation result.
 */
export interface AIEvaluation {
  model: string
  verdict: 'APPROVED' | 'DENIED'
  confidence: number // 0-100
  riskCategory: 'SAFE' | 'ELEVATED' | 'HIGH' | 'CRITICAL'
  reason: string
}

/**
 * Aggregated final verdict from the SentinelCRE pipeline.
 */
export interface SentinelVerdict {
  agentId: string
  approved: boolean
  riskScore: number // 0-100
  riskCategory: string
  actionHash: string
  attestationHash: string
  reason: string

  /** Breakdown (included in encrypted incident report, NOT on-chain) */
  policyResult?: PolicyResult
  anomalyScore?: number
  behavioralResult?: BehavioralAnalysisResult
  aiEvaluations?: AIEvaluation[]
}

/**
 * The minimal verdict struct that goes on-chain.
 * Everything else stays encrypted in Vault DON.
 */
export interface OnChainVerdict {
  agentId: string
  approved: boolean
  riskScore: number
  riskCategory: string
  actionHash: string
  attestationHash: string
  reason: string
}
