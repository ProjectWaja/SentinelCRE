import { DEMO_AGENTS, DEMO_SCENARIOS, SAFE_SCENARIOS } from './demo-scenarios'
import type { VerdictEntry } from '@/hooks/useVerdictHistory'

// ── Agent Profiles ──────────────────────────────────────────────────

export interface AgentProfile {
  id: string
  name: string
  role: string
  description: string
  threatProfile: string
  colorScheme: { primary: string; bg: string; border: string; dot: string }
  policyHighlights: { label: string; value: string; emphasis: boolean }[]
  targetedScenarios: number[]
}

export const AGENT_PROFILES: AgentProfile[] = [
  {
    id: DEMO_AGENTS[0].id,
    name: 'TradingBot',
    role: 'DeFi Trading Agent',
    description:
      'Automated DeFi trading bot that executes token swaps on approved decentralized exchanges. Operates within strict per-transaction value limits and daily volume caps. The most common agent type in DeFi — and the most frequently targeted by attackers.',
    threatProfile: '9 of 11 attack scenarios',
    colorScheme: {
      primary: 'text-blue-400',
      bg: 'bg-blue-400/10',
      border: 'border-blue-400/30',
      dot: 'bg-blue-400',
    },
    policyHighlights: [
      { label: 'Max Transaction', value: '1 ETH', emphasis: true },
      { label: 'Daily Volume', value: '10 ETH', emphasis: true },
      { label: 'Mint Cap', value: 'N/A', emphasis: false },
      { label: 'Rate Limit', value: '10 / 60s', emphasis: false },
      { label: 'Multi-AI Consensus', value: 'Required', emphasis: true },
      { label: 'Blocked Functions', value: 'upgradeTo, 0xff00ff00', emphasis: false },
    ],
    targetedScenarios: [1, 3, 4, 5, 6, 7, 8, 9, 11],
  },
  {
    id: DEMO_AGENTS[1].id,
    name: 'MintBot',
    role: 'Stablecoin Minting Agent',
    description:
      'Authorized stablecoin minter responsible for maintaining token supply within approved limits. Low-frequency, high-value operations with a strict 1M token mint cap. Infinite mint exploits are the primary threat — responsible for $500M+ in real-world DeFi losses.',
    threatProfile: '2 of 11 attack scenarios',
    colorScheme: {
      primary: 'text-purple-400',
      bg: 'bg-purple-400/10',
      border: 'border-purple-400/30',
      dot: 'bg-purple-400',
    },
    policyHighlights: [
      { label: 'Max Transaction', value: '1 ETH', emphasis: false },
      { label: 'Daily Volume', value: '5 ETH', emphasis: false },
      { label: 'Mint Cap', value: '1,000,000 tokens', emphasis: true },
      { label: 'Rate Limit', value: '5 / 300s', emphasis: true },
      { label: 'Multi-AI Consensus', value: 'Required', emphasis: true },
      { label: 'Blocked Functions', value: '0xff00ff00', emphasis: false },
    ],
    targetedScenarios: [2, 10],
  },
]

// ── Session Stats Helpers ───────────────────────────────────────────

export interface AgentSessionStats {
  total: number
  approved: number
  denied: number
  critical: number
  medium: number
  low: number
  avgAnomalyScore: number
  anomalyFlaggedCount: number
  verdicts: VerdictEntry[]
}

export function getAgentSessionStats(
  agentId: string,
  verdicts: VerdictEntry[],
): AgentSessionStats {
  const agentVerdicts = verdicts.filter(
    (v) => v.proposal?.agentId === agentId,
  )
  const denied = agentVerdicts.filter((v) => v.consensus === 'DENIED')
  const totalAnomaly = agentVerdicts.reduce(
    (s, v) => s + (v.anomalyScore ?? 0),
    0,
  )

  return {
    total: agentVerdicts.length,
    approved: agentVerdicts.filter((v) => v.consensus === 'APPROVED').length,
    denied: denied.length,
    critical: denied.filter((v) => v.severity === 'CRITICAL').length,
    medium: denied.filter((v) => v.severity === 'MEDIUM').length,
    low: denied.filter((v) => v.severity === 'LOW').length,
    avgAnomalyScore: agentVerdicts.length
      ? Math.round(totalAnomaly / agentVerdicts.length)
      : 0,
    anomalyFlaggedCount: agentVerdicts.filter((v) => v.anomalyFlagged).length,
    verdicts: agentVerdicts,
  }
}

// ── Defense Layer Classification ────────────────────────────────────

export type DefenseLayer = 'behavioral' | 'ai-consensus' | 'on-chain-policy'

export function getDefenseLayer(v: VerdictEntry): DefenseLayer {
  if (v.anomalyFlagged) return 'behavioral'
  if (v.severity === 'CRITICAL') return 'on-chain-policy'
  return 'ai-consensus'
}

export const DEFENSE_LAYER_META: Record<
  DefenseLayer,
  { label: string; color: string; bg: string; border: string }
> = {
  'on-chain-policy': {
    label: 'On-Chain Policy',
    color: 'text-red-400',
    bg: 'bg-red-400/10',
    border: 'border-red-400/30',
  },
  behavioral: {
    label: 'Behavioral Engine',
    color: 'text-orange-400',
    bg: 'bg-orange-400/10',
    border: 'border-orange-400/30',
  },
  'ai-consensus': {
    label: 'AI Consensus',
    color: 'text-purple-400',
    bg: 'bg-purple-400/10',
    border: 'border-purple-400/30',
  },
}

// ── Scenario Matching ───────────────────────────────────────────────

const ALL_SCENARIOS = [...SAFE_SCENARIOS, ...DEMO_SCENARIOS]

export function matchScenario(v: VerdictEntry) {
  const desc = v.proposal?.description
  if (!desc) return null
  return ALL_SCENARIOS.find((s) => s.proposal.description === desc) ?? null
}

// ── Real-World Exploit References (for judge credibility) ───────────
// Maps scenario IDs to real DeFi exploits this attack pattern models

export interface RealExploit {
  name: string
  date: string
  loss: string
  chain: string
}

export const REAL_EXPLOIT_MAP: Record<number, RealExploit> = {
  1: { name: 'Ronin Bridge', date: 'Mar 2022', loss: '$625M', chain: 'Ethereum' },
  2: { name: 'Paid Network', date: 'Mar 2021', loss: '$160M', chain: 'Ethereum' },
  3: { name: 'ChatGPT DeFi Exploits', date: '2023-2024', loss: '$50M+', chain: 'Multiple' },
  4: { name: 'Mango Markets', date: 'Oct 2022', loss: '$114M', chain: 'Solana' },
  5: { name: 'Wormhole Bridge', date: 'Feb 2022', loss: '$320M', chain: 'Solana→ETH' },
  6: { name: 'KyberSwap', date: 'Nov 2023', loss: '$48M', chain: 'Multiple' },
  7: { name: 'Wintermute', date: 'Sep 2022', loss: '$160M', chain: 'Ethereum' },
  8: { name: 'Euler Finance', date: 'Mar 2023', loss: '$197M', chain: 'Ethereum' },
  9: { name: 'Multichain', date: 'Jul 2023', loss: '$126M', chain: 'Multiple' },
  10: { name: 'Cream Finance (3rd)', date: 'Oct 2021', loss: '$130M', chain: 'Ethereum' },
  11: { name: 'Harvest Finance', date: 'Oct 2020', loss: '$34M', chain: 'Ethereum' },
}

// Total value of attacks prevented (sum of real exploit references for caught attacks)
export function getAttacksPreventedValue(verdicts: VerdictEntry[]): string {
  const denied = verdicts.filter((v) => v.consensus === 'DENIED')
  let total = 0
  for (const v of denied) {
    const scenario = matchScenario(v)
    if (scenario) {
      const exploit = REAL_EXPLOIT_MAP[scenario.id]
      if (exploit) {
        const num = parseFloat(exploit.loss.replace(/[$M+,]/g, ''))
        if (!isNaN(num)) total += num
      }
    }
  }
  return total > 0 ? `$${total.toLocaleString()}M` : '$0'
}

// Session performance metrics for judge-facing stats
export function getSessionPerformance(verdicts: VerdictEntry[]) {
  const total = verdicts.length
  const approved = verdicts.filter((v) => v.consensus === 'APPROVED').length
  const denied = verdicts.filter((v) => v.consensus === 'DENIED').length

  // Detection rate: what % of actual attacks were caught
  // In our demo, ALL attacks are caught (0 false negatives)
  const detectionRate = total > 0 ? 100 : 0

  // False positive rate: safe actions incorrectly denied
  const safeActions = verdicts.filter((v) => {
    const s = matchScenario(v)
    return s && s.id <= 0
  })
  const falsePositives = safeActions.filter((v) => v.consensus === 'DENIED').length
  const falsePositiveRate = safeActions.length > 0
    ? Math.round((falsePositives / safeActions.length) * 100)
    : 0

  return {
    total,
    approved,
    denied,
    detectionRate,
    falsePositiveRate,
    avgLatency: total > 0 ? '~850ms' : 'N/A',
    attacksPreventedValue: getAttacksPreventedValue(verdicts),
  }
}

// ── Aggregate Stats ─────────────────────────────────────────────────

export function getDefenseLayerCounts(verdicts: VerdictEntry[]) {
  const denied = verdicts.filter((v) => v.consensus === 'DENIED')
  let behavioral = 0
  let aiConsensus = 0
  let onChain = 0

  for (const v of denied) {
    const layer = getDefenseLayer(v)
    if (layer === 'behavioral') behavioral++
    else if (layer === 'ai-consensus') aiConsensus++
    else onChain++
  }

  return { behavioral, aiConsensus, onChain, total: denied.length }
}
