'use client'

import { useState } from 'react'

/* ─────────────── Table of Contents Sections ─────────────── */
const TOC = [
  { id: 'problem', label: 'Problem', color: 'text-red-400' },
  { id: 'techstack', label: 'Tech Stack', color: 'text-gray-400' },
  { id: 'defense', label: 'Defense Model', color: 'text-orange-400' },
  { id: 'pipeline', label: 'Pipeline', color: 'text-cyan-400' },
  { id: 'chainlink', label: 'Chainlink', color: 'text-blue-400' },
  { id: 'contracts', label: 'Contracts', color: 'text-green-400' },
  { id: 'behavioral', label: 'Behavioral', color: 'text-purple-400' },
  { id: 'ecosystem', label: 'Ecosystem', color: 'text-yellow-400' },
  { id: 'prevention', label: 'Prevention', color: 'text-cyan-400' },
]

/* ─────────────── Data ─────────────── */

const EXPLOITS = [
  {
    name: 'Ronin Bridge',
    amount: '$625M',
    amountNum: 625,
    date: 'Mar 2022',
    method: 'Compromised validator keys',
    color: 'border-l-red-500',
    bg: 'bg-red-500/5',
    textColor: 'text-red-400',
    problem: [
      'Axie Infinity\'s Ronin sidechain bridge was drained by North Korea\'s Lazarus Group.',
      'Attackers social-engineered access to 5 of the 9 validator private keys needed to approve withdrawals.',
      'Funds were siphoned in two transactions over 6 days — nobody noticed until a user couldn\'t withdraw.',
    ],
    prevention: 'Behavioral engine detects anomalous withdrawal size (Value Deviation) and unknown target addresses (Contract Diversity). Dual-AI flags the unprecedented volume.',
    caughtBy: ['L2', 'L3'] as ('L1' | 'L2' | 'L3')[],
    stoppedAt: 'Behavioral Risk Scoring',
  },
  {
    name: 'Poly Network',
    amount: '$611M',
    amountNum: 611,
    date: 'Aug 2021',
    method: 'Cross-chain relay exploit',
    color: 'border-l-rose-500',
    bg: 'bg-rose-500/5',
    textColor: 'text-rose-400',
    problem: [
      'Attacker exploited a flaw in the cross-chain message verification logic to forge relay messages.',
      'Drained funds across Ethereum, BSC, and Polygon simultaneously — the first major multi-chain exploit.',
      'The keeper contract blindly executed cross-chain messages without validating the source properly.',
    ],
    prevention: 'On-chain policy enforces target address whitelists. Sequential Probing detection catches the attacker\'s test transactions before the main drain.',
    caughtBy: ['L1', 'L2'] as ('L1' | 'L2' | 'L3')[],
    stoppedAt: 'On-Chain Policy',
  },
  {
    name: 'Wormhole',
    amount: '$320M',
    amountNum: 320,
    date: 'Feb 2022',
    method: 'Forged guardian signatures',
    color: 'border-l-orange-500',
    bg: 'bg-orange-500/5',
    textColor: 'text-orange-400',
    problem: [
      'Exploited a signature verification bug in the Solana-side bridge contract.',
      'Attacker minted 120,000 wETH on Solana without depositing any collateral on Ethereum.',
      'The bug allowed spoofing the guardian set validation — a single crafted instruction bypassed multi-sig.',
    ],
    prevention: 'Mint cap enforcement (Layer 1) blocks uncollateralized minting. Dual-AI consensus independently flags 120,000 wETH as far exceeding normal minting behavior.',
    caughtBy: ['L1', 'L3'] as ('L1' | 'L2' | 'L3')[],
    stoppedAt: 'On-Chain Policy',
  },
  {
    name: 'Euler Finance',
    amount: '$197M',
    amountNum: 197,
    date: 'Mar 2023',
    method: 'Flash loan liquidation attack',
    color: 'border-l-yellow-500',
    bg: 'bg-yellow-500/5',
    textColor: 'text-yellow-400',
    problem: [
      'Attacker used flash loans to manipulate their own health factor on the lending protocol.',
      'Created an artificially undercollateralized position, then exploited the liquidation logic to extract profit.',
      'Combined multiple DeFi primitives (flash loan \u2192 deposit \u2192 borrow \u2192 donate \u2192 liquidate) in a single transaction.',
    ],
    prevention: 'Function Pattern scoring flags unusual call sequences. Velocity detection catches the burst of contract interactions within one block.',
    caughtBy: ['L2'] as ('L1' | 'L2' | 'L3')[],
    stoppedAt: 'Behavioral Risk Scoring',
  },
  {
    name: 'Nomad Bridge',
    amount: '$190M',
    amountNum: 190,
    date: 'Aug 2022',
    method: 'Copy-paste initialization exploit',
    color: 'border-l-amber-500',
    bg: 'bg-amber-500/5',
    textColor: 'text-amber-400',
    problem: [
      'A routine upgrade accidentally set the trusted root to 0x00, making every message automatically valid.',
      'The first attacker\'s successful transaction became a template — hundreds of copycats simply changed the recipient address.',
      'Over 300 wallets drained the bridge in a chaotic "crowd-sourced" exploit over several hours.',
    ],
    prevention: 'Rate limiting (Layer 1) throttles rapid withdrawals. Cumulative Drift detection catches the aggregate drain pattern even if individual transactions look small.',
    caughtBy: ['L1', 'L2'] as ('L1' | 'L2' | 'L3')[],
    stoppedAt: 'On-Chain Policy',
  },
  {
    name: 'Beanstalk',
    amount: '$182M',
    amountNum: 182,
    date: 'Apr 2022',
    method: 'Flash loan governance attack',
    color: 'border-l-lime-500',
    bg: 'bg-lime-500/5',
    textColor: 'text-lime-400',
    problem: [
      'Attacker used a flash loan to borrow enough governance tokens to pass a malicious proposal in a single transaction.',
      'The proposal drained the entire protocol treasury — governance vote, execution, and drain all in one block.',
      'Exploited the lack of a time-lock or delay between proposal passage and execution.',
    ],
    prevention: 'On-chain policy blocks calls to governance functions. Behavioral engine flags the Function Pattern anomaly of a never-before-seen governance call.',
    caughtBy: ['L1', 'L2'] as ('L1' | 'L2' | 'L3')[],
    stoppedAt: 'On-Chain Policy',
  },
  {
    name: 'Mango Markets',
    amount: '$114M',
    amountNum: 114,
    date: 'Oct 2022',
    method: 'Oracle price manipulation',
    color: 'border-l-emerald-500',
    bg: 'bg-emerald-500/5',
    textColor: 'text-emerald-400',
    problem: [
      'Attacker manipulated the spot price of MNGO on illiquid markets to inflate their collateral value.',
      'Used the inflated position to borrow against it, draining the protocol\'s lending pools.',
      'Avraham Eisenberg publicly claimed it was "a highly profitable trading strategy" — he was later arrested.',
    ],
    prevention: 'Value Deviation scoring flags the extreme collateral-to-borrow ratio. Dual-AI consensus recognizes the oracle manipulation pattern from training data.',
    caughtBy: ['L2', 'L3'] as ('L1' | 'L2' | 'L3')[],
    stoppedAt: 'Dual-AI Consensus',
  },
]

const AI_AGENT_INCIDENTS = [
  {
    name: 'AIXBT Hack',
    amount: '$106K',
    amountNum: 0.106,
    date: 'Mar 2025',
    method: 'Dashboard compromise',
    color: 'border-l-red-500',
    bg: 'bg-red-500/5',
    textColor: 'text-red-400',
    problem: [
      'AI agent on Base was compromised when an attacker accessed its dashboard at 2 AM while operators slept.',
      'Attacker drained 55 ETH in minutes — the agent had no time-of-day anomaly detection or kill switch.',
      'No pre-execution risk controls existed to freeze the agent or flag the off-hours activity.',
    ],
    prevention: 'Behavioral engine detects "EMERGENCY" + "immediately" social engineering pattern (Time-of-Day [REDACTED]) and "transfer all" fund extraction language (Value Deviation [REDACTED]). Score [REDACTED] triggers DENY — exactly the off-hours drain SentinelCRE was built to stop.',
    caughtBy: ['L2'] as ('L1' | 'L2' | 'L3')[],
    stoppedAt: 'Behavioral Risk Scoring',
  },
  {
    name: 'Moonwell Exploit',
    amount: '$1.78M',
    amountNum: 1.78,
    date: 'Feb 2025',
    method: 'AI-generated oracle bug',
    color: 'border-l-rose-500',
    bg: 'bg-rose-500/5',
    textColor: 'text-rose-400',
    problem: [
      'AI-generated code introduced an oracle manipulation bug into the live Moonwell DeFi protocol.',
      'The agent that wrote the code had no risk evaluation layer — the vulnerability shipped to production.',
      '$1.78 million drained before anyone noticed the faulty price feed logic.',
    ],
    prevention: 'Flash loan targeting unapproved contract is caught at Layer 1 (target whitelist + value limit). Dual-AI consensus independently recognizes the oracle manipulation pattern. All three layers trigger simultaneously.',
    caughtBy: ['L1', 'L2', 'L3'] as ('L1' | 'L2' | 'L3')[],
    stoppedAt: 'On-Chain Policy',
  },
  {
    name: 'Anthropic Research',
    amount: '$1.22',
    amountNum: 0,
    date: '2025',
    method: 'Autonomous exploit discovery',
    color: 'border-l-orange-500',
    bg: 'bg-orange-500/5',
    textColor: 'text-orange-400',
    problem: [
      'Anthropic demonstrated that AI agents can autonomously discover and exploit over half of historically attacked smart contracts.',
      'Average cost per successful exploit: $1.22. This enables automated exploitation at unprecedented scale.',
      'Proves that AI agents can be weaponized — and that hiding risk thresholds (via Confidential Compute) is essential.',
    ],
    prevention: 'Sequential Probing detection (+[REDACTED]) catches the binary-search doubling pattern. Cumulative Drift (+[REDACTED]) flags deviation from origin baseline. Value Deviation (+12) confirms anomalous amounts. Score [REDACTED] triggers DENY — and Confidential Compute means the agent can\'t even see the thresholds it\'s probing for.',
    caughtBy: ['L2'] as ('L1' | 'L2' | 'L3')[],
    stoppedAt: 'Behavioral Risk Scoring',
  },
  {
    name: 'Bybit Hack',
    amount: '$1.5B',
    amountNum: 1500,
    date: 'Feb 2025',
    method: 'Largest single crypto theft',
    color: 'border-l-amber-500',
    bg: 'bg-amber-500/5',
    textColor: 'text-amber-400',
    problem: [
      'Largest single crypto theft in history — $1.5 billion stolen by North Korea\'s Lazarus Group.',
      'No pre-execution risk controls caught the anomalous withdrawal pattern before funds left.',
      'Demonstrates that even the largest exchanges lack adaptive behavioral risk monitoring.',
    ],
    prevention: 'Value 100x above policy limit is caught instantly at Layer 1 (PolicyLib.checkValue). Behavioral engine flags the unprecedented withdrawal size. Agent frozen permanently — CRITICAL severity, no appeal, circuit breaker triggered.',
    caughtBy: ['L1', 'L2'] as ('L1' | 'L2' | 'L3')[],
    stoppedAt: 'On-Chain Policy',
  },
]

const LAYER_TAG_STYLES = {
  L1: { label: 'L1 Policy', bg: 'bg-red-500/15', text: 'text-red-400', border: 'border-red-500/30' },
  L2: { label: 'L2 Behavioral', bg: 'bg-orange-500/15', text: 'text-orange-400', border: 'border-orange-500/30' },
  L3: { label: 'L3 Dual-AI', bg: 'bg-purple-500/15', text: 'text-purple-400', border: 'border-purple-500/30' },
} as const

const DEFENSE_LAYERS = [
  {
    layer: 1,
    name: 'On-Chain Policy',
    subtitle: 'PolicyLib.sol',
    color: 'red',
    ringColor: 'border-red-500',
    bg: 'bg-red-500/10',
    textColor: 'text-red-400',
    tagline: 'Immutable on-chain rules that no AI can override',
    details: [
      'Value limits per transaction and per window',
      'Target address whitelist enforcement',
      'Function selector blocklist',
      'Rate limiting (max actions per time window)',
      'Mint cap enforcement (absolute token ceiling)',
      'Proof of Reserves via Chainlink Data Feeds — verifies reserve backing before mints with cumulative tracking',
    ],
  },
  {
    layer: 2,
    name: 'Behavioral Risk Engine',
    subtitle: '7-Dimension Anomaly Detection',
    color: 'orange',
    ringColor: 'border-orange-500',
    bg: 'bg-orange-500/10',
    textColor: 'text-orange-400',
    tagline: 'Learns what normal looks like, catches what rules can\'t',
    details: [
      'Value Deviation — flags amounts far above historical average',
      'Contract Diversity — detects sudden interaction with unknown contracts',
      'Velocity — catches burst-rate transactions above baseline',
      'Function Pattern — identifies unusual function calls for agent type',
      'Time-of-Day — flags activity outside normal operating hours',
      'Sequential Probing — detects monotonically increasing values',
      'Cumulative Drift — catches slow baseline poisoning over time',
    ],
  },
  {
    layer: 3,
    name: 'Dual-AI Consensus',
    subtitle: 'Claude + GPT-4',
    color: 'purple',
    ringColor: 'border-purple-500',
    bg: 'bg-purple-500/10',
    textColor: 'text-purple-400',
    tagline: 'Even if one AI is compromised, the other catches it',
    details: [
      'Independent evaluation by two separate AI models',
      'Each model receives full context: action, policy, behavioral score',
      'Both must independently APPROVE for the action to proceed',
      'DON consensus aggregates and verifies AI responses',
      'Confidential HTTP hides API keys from DON node operators',
    ],
  },
]

const PIPELINE_STEPS = [
  { step: 1, title: 'Receive Proposal', desc: 'Agent submits action', service: 'CRE HTTP Trigger', color: 'border-blue-500', bg: 'bg-blue-500/10', text: 'text-blue-400' },
  { step: 2, title: 'Read Policy', desc: 'Fetch on-chain rules', service: 'CRE EVMClient', color: 'border-cyan-500', bg: 'bg-cyan-500/10', text: 'text-cyan-400' },
  { step: 3, title: 'Behavioral Scoring', desc: '7-dimension anomaly check', service: 'CRE Workflow', color: 'border-orange-500', bg: 'bg-orange-500/10', text: 'text-orange-400' },
  { step: 4, title: 'AI Model 1 (Claude)', desc: 'Independent risk evaluation', service: 'Confidential HTTP', color: 'border-purple-500', bg: 'bg-purple-500/10', text: 'text-purple-400' },
  { step: 5, title: 'AI Model 2 (GPT-4)', desc: 'Independent risk evaluation', service: 'Confidential HTTP', color: 'border-violet-500', bg: 'bg-violet-500/10', text: 'text-violet-400' },
  { step: 6, title: 'DON Consensus', desc: 'Aggregate and verify', service: 'CRE Consensus', color: 'border-yellow-500', bg: 'bg-yellow-500/10', text: 'text-yellow-400' },
  { step: 7, title: 'Write Verdict', desc: 'Record on-chain', service: 'CRE EVMClient', color: 'border-green-500', bg: 'bg-green-500/10', text: 'text-green-400' },
  { step: 8, title: 'Enforcement', desc: 'Freeze/approve agent', service: 'SentinelGuardian.sol', color: 'border-emerald-500', bg: 'bg-emerald-500/10', text: 'text-emerald-400' },
]

const CHAINLINK_INTEGRATIONS = [
  { name: 'CRE Workflow Engine', desc: 'HTTP + Cron triggers orchestrate the full verdict pipeline end-to-end.', status: 'LIVE', file: 'sentinel-workflow/main.ts', color: 'text-blue-400', bg: 'bg-blue-400/10', border: 'border-blue-400/30' },
  { name: 'CRE HTTPClient', desc: 'Calls Claude and GPT-4 for independent dual-AI risk evaluation with ConsensusAggregationByFields.', status: 'LIVE', file: 'sentinel-workflow/main.ts', color: 'text-cyan-400', bg: 'bg-cyan-400/10', border: 'border-cyan-400/30' },
  { name: 'CRE EVMClient', desc: 'Reads agent policies from SentinelGuardian and writes signed verdicts on-chain.', status: 'LIVE', file: 'sentinel-workflow/main.ts', color: 'text-green-400', bg: 'bg-green-400/10', border: 'border-green-400/30' },
  { name: 'CRE CronCapability', desc: 'Periodic health sweeps detect anomalous agents and auto-freeze them between proposals.', status: 'LIVE', file: 'sentinel-workflow/main.ts', color: 'text-yellow-400', bg: 'bg-yellow-400/10', border: 'border-yellow-400/30' },
  { name: 'Confidential HTTP', desc: 'Hides AI API keys and guardrail thresholds from DON node operators during evaluation.', status: 'LIVE', file: 'sentinel-workflow/main.ts', color: 'text-purple-400', bg: 'bg-purple-400/10', border: 'border-purple-400/30' },
  { name: 'Confidential Compute', desc: 'Hides policy parameters from AI agents to prevent adversarial gaming of thresholds.', status: 'LIVE', file: 'sentinel-workflow/main.ts', color: 'text-orange-400', bg: 'bg-orange-400/10', border: 'border-orange-400/30' },
  { name: 'Behavioral Risk Engine', desc: 'Custom 7-dimension anomaly detection scoring system running inside CRE workflow.', status: 'LIVE', file: 'api-server/server.ts', color: 'text-rose-400', bg: 'bg-rose-400/10', border: 'border-rose-400/30' },
]

const BEHAVIORAL_DIMENSIONS = [
  {
    name: 'Value Deviation',
    max: 25,
    total: 230,
    desc: 'Flags transactions significantly above the agent\'s historical average',
    examples: [
      'Agent usually sends 0.1 ETH, suddenly tries 50 ETH',
      'Minting agent\'s average is 5,000 tokens but requests 900,000 in one action',
    ],
    color: 'bg-red-500',
  },
  {
    name: 'Contract Diversity',
    max: 20,
    total: 230,
    desc: 'Detects when agent suddenly interacts with unknown contracts',
    examples: [
      'DeFi trading agent starts calling NFT minting contracts it\'s never used before',
      'Swap agent sends funds to an unverified proxy contract outside its whitelist',
    ],
    color: 'bg-orange-500',
  },
  {
    name: 'Velocity',
    max: 50,
    total: 230,
    desc: 'Catches burst-rate transactions faster than the agent\'s baseline',
    examples: [
      '16+ rapid transactions vs. the agent\'s normal 2/minute — micro-drain pattern',
      'Agent that normally acts every 5 minutes suddenly fires 8 actions in 30 seconds',
    ],
    color: 'bg-yellow-500',
  },
  {
    name: 'Function Pattern',
    max: 50,
    total: 230,
    desc: 'Identifies unusual function calls or near-limit exploitation for this agent type',
    examples: [
      'Minting agent requests 90%+ of its authorized cap in a single action',
      'Trading bot invoking transferOwnership() or upgradeTo() — admin functions it should never use',
    ],
    color: 'bg-purple-500',
  },
  {
    name: 'Time-of-Day',
    max: 30,
    total: 230,
    desc: 'Flags activity outside the agent\'s normal operating hours or urgency language',
    examples: [
      'Business-hours agent active at 3 AM UTC when it\'s never operated at that time',
      'Action description uses "EMERGENCY" + "immediately" — social engineering pattern',
    ],
    color: 'bg-blue-500',
  },
  {
    name: 'Sequential Probing',
    max: 35,
    total: 230,
    desc: 'Detects monotonically increasing values (threshold hunting)',
    examples: [
      'Agent sends 0.025, 0.05, 0.1, 0.2, 0.4, 0.8 ETH — binary search probing for the limit',
      'Minting 100, 200, 400, 800 tokens in sequence to find the mint cap',
    ],
    color: 'bg-pink-500',
  },
  {
    name: 'Cumulative Drift',
    max: 20,
    total: 230,
    desc: 'Catches slow baseline poisoning over many transactions',
    examples: [
      'Gradually increasing average from 0.1 ETH to 0.8 ETH over 12 small transactions',
      'Slowly adding new target contracts one-at-a-time to normalize unusual contract diversity',
    ],
    color: 'bg-teal-500',
  },
]

const ECOSYSTEM_STATS = [
  {
    metric: '100M+',
    label: 'AI agent payments',
    source: 'Coinbase x402',
    desc: 'Coinbase x402 processed over 100 million AI agent payments in 2025. Those agents need risk controls before they touch DeFi.',
    color: 'text-blue-400',
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/30',
  },
  {
    metric: '$1B',
    label: 'institutional deposits target',
    source: 'Aave Horizon',
    desc: 'Aave Horizon is targeting a billion dollars in institutional deposits managed by autonomous strategies. Institutional capital requires institutional-grade risk monitoring.',
    color: 'text-purple-400',
    bg: 'bg-purple-500/10',
    border: 'border-purple-500/30',
  },
  {
    metric: '2026',
    label: '"Know Your Agent"',
    source: 'a16z Prediction',
    desc: 'a16z predicts 2026 is the year of "Know Your Agent" \u2014 cryptographic identity linking agents to their constraints. That\u2019s exactly what SentinelCRE enforces on-chain.',
    color: 'text-green-400',
    bg: 'bg-green-500/10',
    border: 'border-green-500/30',
  },
  {
    metric: '17%',
    label: 'monitor agent interactions',
    source: 'Industry Gap',
    desc: 'Only 17% of organizations continuously monitor agent-to-agent interactions. The $30 trillion agentic economy is being built with no risk layer.',
    color: 'text-red-400',
    bg: 'bg-red-500/10',
    border: 'border-red-500/30',
  },
]

const TECH_BADGES = ['Solidity 0.8.24', 'Foundry', 'CRE SDK (TypeScript)', 'Bun', 'Next.js 15', 'Tenderly Virtual TestNet', 'viem', 'Tailwind 4']

const TECH_STATS = [
  { label: '90 tests', sublabel: 'Forge', color: 'text-green-400' },
  { label: '14 scenarios', sublabel: 'Demo', color: 'text-cyan-400' },
  { label: '2 AI models', sublabel: 'Claude + GPT-4', color: 'text-purple-400' },
  { label: '7 dimensions', sublabel: 'Behavioral', color: 'text-orange-400' },
]

const KEY_DIFFERENTIATORS = [
  {
    title: 'Pre-Execution',
    desc: 'Blocks attacks before they hit the chain — not after damage is done',
    icon: '&#9889;',
    color: 'text-cyan-400',
    bg: 'bg-cyan-500/10',
    border: 'border-cyan-500/30',
  },
  {
    title: 'Defense in Depth',
    desc: '3 independent layers — policy, behavioral, and AI. Compromise one, the others still catch it.',
    icon: '&#128737;',
    color: 'text-red-400',
    bg: 'bg-red-500/10',
    border: 'border-red-500/30',
  },
  {
    title: 'Dual-AI Consensus',
    desc: 'Two competing AI models must agree — eliminating single points of failure in AI evaluation',
    icon: '&#129504;',
    color: 'text-purple-400',
    bg: 'bg-purple-500/10',
    border: 'border-purple-500/30',
  },
  {
    title: 'Confidential Compute',
    desc: 'Behavioral thresholds and AI prompts hidden inside TEE — agents can\'t probe or reverse-engineer L2/L3 criteria',
    icon: '&#128274;',
    color: 'text-orange-400',
    bg: 'bg-orange-500/10',
    border: 'border-orange-500/30',
  },
]

const GUARDIAN_CODE = `function processVerdict(bytes calldata verdictData)
    external onlyRole(SENTINEL_ROLE) whenNotPaused
{
    (bytes32 agentId, bool approved,
     string memory reason, address target,
     uint256 value) = abi.decode(
        verdictData,
        (bytes32, bool, string, address, uint256)
    );

    if (!approved) {
        _freezeAgent(agentId, reason);
        emit IncidentRecorded(
            agentId, IncidentType.ConsensusFailure,
            reason, target, value
        );
    }

    actionStats[agentId].total++;
    approved
        ? actionStats[agentId].approved++
        : actionStats[agentId].denied++;
}`

const REGISTRY_CODE = `function registerAgent(
    bytes32 agentId,
    string calldata name,
    string calldata description
) external onlyOwner {
    require(
        !agents[agentId].exists,
        "Agent already registered"
    );
    agents[agentId] = Agent(
        name, description, msg.sender,
        uint64(block.timestamp), true
    );
    agentIds.push(agentId);
    emit AgentRegistered(agentId, name, msg.sender);
}`

/* ─────────────── Chevron Icon ─────────────── */
function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      className={`w-5 h-5 text-gray-500 transition-transform duration-300 ${open ? 'rotate-180' : ''}`}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
    </svg>
  )
}

/* ─────────────── Section Wrapper ─────────────── */
function Section({
  id,
  borderColor,
  children,
}: {
  id: string
  borderColor: string
  children: React.ReactNode
}) {
  return (
    <section
      id={id}
      className={`bg-gray-900 rounded-2xl border border-gray-800 ${borderColor} border-l-4 p-6 sm:p-8 scroll-mt-48`}
    >
      {children}
    </section>
  )
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-lg font-bold uppercase tracking-widest text-gray-400 mb-4">
      {children}
    </h2>
  )
}

/* ═══════════════ MAIN COMPONENT ═══════════════ */

export default function ArchitecturePanel() {
  const [expandedLayers, setExpandedLayers] = useState<Record<number, boolean>>({})
  const [expandedContracts, setExpandedContracts] = useState<Record<string, boolean>>({})
  const [expandedExploits, setExpandedExploits] = useState<Record<string, boolean>>({})
  const [expandedDimensions, setExpandedDimensions] = useState(false)

  const allProblemExpanded =
    AI_AGENT_INCIDENTS.every((e) => !!expandedExploits[`incident-${e.name}`]) &&
    EXPLOITS.every((e) => !!expandedExploits[`problem-${e.name}`])
  const allPreventionExpanded =
    EXPLOITS.every((e) => !!expandedExploits[`prevent-${e.name}`]) &&
    AI_AGENT_INCIDENTS.every((e) => !!expandedExploits[`prevent-${e.name}`])

  const toggleLayer = (layer: number) =>
    setExpandedLayers((prev) => ({ ...prev, [layer]: !prev[layer] }))
  const toggleContract = (name: string) =>
    setExpandedContracts((prev) => ({ ...prev, [name]: !prev[name] }))
  const toggleExploit = (name: string) =>
    setExpandedExploits((prev) => ({ ...prev, [name]: !prev[name] }))

  return (
    <div className="space-y-6">
      {/* ─── Table of Contents ─── */}
      <nav className="bg-gray-900/80 backdrop-blur-sm rounded-xl border border-gray-800 px-5 py-3.5 sticky top-36 z-30">
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide">
          <span className="text-gray-600 text-base font-mono uppercase tracking-wider mr-2 shrink-0">Jump to:</span>
          {TOC.map((t) => (
            <a
              key={t.id}
              href={`#${t.id}`}
              className={`${t.color} text-base font-semibold px-3 py-1.5 rounded-md hover:bg-gray-800 transition-colors whitespace-nowrap`}
            >
              {t.label}
            </a>
          ))}
        </div>
      </nav>

      {/* ═══════════ SECTION 1: PROBLEM STATEMENT ═══════════ */}
      <Section id="problem" borderColor="border-l-red-500">
        <SectionTitle>Problem Statement</SectionTitle>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-3xl sm:text-4xl font-black text-white">
            Why SentinelCRE Exists
          </h3>
          <button
            onClick={() => {
              const next = !allProblemExpanded
              const updated: Record<string, boolean> = { ...expandedExploits }
              AI_AGENT_INCIDENTS.forEach((e) => { updated[`incident-${e.name}`] = next })
              EXPLOITS.forEach((e) => { updated[`problem-${e.name}`] = next })
              setExpandedExploits(updated)
            }}
            className="text-base text-red-400 hover:text-red-300 transition-colors flex items-center gap-1 cursor-pointer shrink-0"
          >
            {allProblemExpanded ? 'Collapse all' : 'Expand all'}
            <ChevronIcon open={allProblemExpanded} />
          </button>
        </div>
        <p className="text-gray-400 text-xl mb-6">
          Autonomous AI agents are the next frontier of DeFi. They are also the next frontier of DeFi exploits.
        </p>

        {/* Headline damage figure */}
        <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-5 text-center mb-6">
          <div className="text-red-400 text-4xl font-black mb-1">$3.4 Billion stolen in 2025</div>
          <p className="text-gray-400 text-lg">
            The worst year on record for crypto security. North Korea&apos;s Lazarus Group stole $2B alone &mdash; and AI agents are both the targets and the weapons.
          </p>
        </div>

        {/* 2025 AI Agent Incidents — expandable cards */}
        <div className="flex items-center gap-3 mb-3">
          <span className="text-red-400 text-xl">&#9888;</span>
          <h4 className="text-red-400 font-black text-xl uppercase tracking-wider">2025: AI Agents Under Attack</h4>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 mb-6">
          {AI_AGENT_INCIDENTS.map((e) => {
            const open = !!expandedExploits[`incident-${e.name}`]
            return (
              <div
                key={e.name}
                className={`${e.bg} rounded-xl border-l-4 ${e.color} border border-gray-800 overflow-hidden`}
              >
                <button
                  onClick={() => toggleExploit(`incident-${e.name}`)}
                  className="w-full flex items-center justify-between p-5 text-left cursor-pointer"
                >
                  <div className="flex items-center gap-5 min-w-0">
                    <div className={`${e.textColor} text-3xl font-black font-mono shrink-0`}>
                      {e.amount}
                    </div>
                    <div className="min-w-0">
                      <div className="text-white font-bold text-xl">{e.name}</div>
                      <div className="text-gray-400 text-lg truncate">{e.method}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-gray-500 text-lg font-mono">{e.date}</span>
                    <ChevronIcon open={open} />
                  </div>
                </button>
                <div
                  className={`transition-all duration-300 ease-in-out overflow-hidden ${
                    open ? 'max-h-[600px] opacity-100' : 'max-h-0 opacity-0'
                  }`}
                >
                  <div className="px-4 pb-4 border-t border-gray-800/50 pt-3">
                    <ul className="space-y-2">
                      {e.problem.map((d, i) => (
                        <li key={i} className="text-gray-300 text-xl flex items-start gap-2 leading-relaxed">
                          <span className={`${e.textColor} mt-0.5 shrink-0`}>{'\u25B6'}</span>
                          {d}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Historical exploits sub-header */}
        <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-5 text-center mb-4">
          <div className="text-red-400 text-4xl font-black mb-1">$2.2 Billion+ stolen in 2021&ndash;2024</div>
          <p className="text-gray-400 text-lg">
            {EXPLOITS.length} major DeFi exploits &mdash; click any to see what happened
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 mb-6">
          {EXPLOITS.map((e) => {
            const open = !!expandedExploits[`problem-${e.name}`]
            return (
              <div
                key={e.name}
                className={`${e.bg} rounded-xl border-l-4 ${e.color} border border-gray-800 overflow-hidden`}
              >
                <button
                  onClick={() => toggleExploit(`problem-${e.name}`)}
                  className="w-full flex items-center justify-between p-5 text-left cursor-pointer"
                >
                  <div className="flex items-center gap-5 min-w-0">
                    <div className={`${e.textColor} text-3xl font-black font-mono shrink-0`}>
                      {e.amount}
                    </div>
                    <div className="min-w-0">
                      <div className="text-white font-bold text-xl">{e.name}</div>
                      <div className="text-gray-400 text-lg truncate">{e.method}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-gray-500 text-lg font-mono">{e.date}</span>
                    <ChevronIcon open={open} />
                  </div>
                </button>
                <div
                  className={`transition-all duration-300 ease-in-out overflow-hidden ${
                    open ? 'max-h-[600px] opacity-100' : 'max-h-0 opacity-0'
                  }`}
                >
                  <div className="px-4 pb-4 border-t border-gray-800/50 pt-3">
                    <ul className="space-y-2">
                      {e.problem.map((d, i) => (
                        <li key={i} className="text-gray-300 text-xl flex items-start gap-2 leading-relaxed">
                          <span className={`${e.textColor} mt-0.5 shrink-0`}>{'\u25B6'}</span>
                          {d}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        <div className="mt-6 bg-gray-800/50 rounded-xl p-5 border border-gray-700/50">
          <p className="text-white text-xl font-medium text-center leading-relaxed">
            What if there was a decentralized AI guardian that stopped every one of these attacks{' '}
            <span className="text-cyan-400 font-bold">before they executed</span>?
          </p>
        </div>
      </Section>

      {/* ═══════════ SECTION 2: TECHNOLOGY STACK ═══════════ */}
      <Section id="techstack" borderColor="border-l-gray-500">
        <SectionTitle>Technology Stack</SectionTitle>
        <h3 className="text-3xl font-black text-white mb-6">Built With</h3>

        <div className="flex flex-wrap gap-2 mb-6">
          {TECH_BADGES.map((badge) => (
            <span
              key={badge}
              className="text-lg font-mono text-gray-300 bg-gray-800 px-4 py-2 rounded-lg border border-gray-700"
            >
              {badge}
            </span>
          ))}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {TECH_STATS.map((stat) => (
            <div key={stat.label} className="bg-gray-800/50 rounded-xl p-5 border border-gray-700/50 text-center">
              <div className={`${stat.color} text-2xl font-black`}>{stat.label}</div>
              <div className="text-gray-500 text-base mt-1">{stat.sublabel}</div>
            </div>
          ))}
        </div>
      </Section>

      {/* ═══════════ SECTION 3: THREE-LAYER DEFENSE ═══════════ */}
      <Section id="defense" borderColor="border-l-orange-500">
        <SectionTitle>Three-Layer Defense Model</SectionTitle>
        <h3 className="text-3xl font-black text-white mb-2">Defense in Depth</h3>
        <p className="text-gray-400 text-xl mb-6">
          Three concentric layers of protection. An attacker must bypass all three simultaneously to succeed.
        </p>

        {/* Rings + Key Differentiators — side by side */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6 items-center">
          {/* Concentric rings visual — interactive, linked to expandable cards */}
          <div className="relative flex items-center justify-center py-4">
            {/* L3 outer ring */}
            <div
              onClick={() => toggleLayer(3)}
              className={`relative w-full max-w-md aspect-square rounded-full border-2 border-dashed flex items-center justify-center p-5 sm:p-8 cursor-pointer transition-all duration-500 ${
                expandedLayers[3]
                  ? 'border-purple-400 bg-purple-500/10 shadow-[0_0_40px_rgba(168,85,247,0.25)] scale-[1.01]'
                  : 'border-purple-500/40 hover:border-purple-500/60'
              }`}
            >
              <span className={`absolute -top-4 left-1/2 -translate-x-1/2 bg-gray-900 px-3 text-base font-black uppercase tracking-wider whitespace-nowrap transition-colors duration-500 ${
                expandedLayers[3] ? 'text-purple-300' : 'text-purple-400'
              }`}>
                Layer 3 &mdash; Dual-AI Consensus
              </span>
              {/* L2 middle ring */}
              <div
                onClick={(e) => { e.stopPropagation(); toggleLayer(2) }}
                className={`relative w-full aspect-square rounded-full border-2 border-dashed flex items-center justify-center p-5 sm:p-7 cursor-pointer transition-all duration-500 ${
                  expandedLayers[2]
                    ? 'border-orange-400 bg-orange-500/10 shadow-[0_0_30px_rgba(249,115,22,0.25)] scale-[1.01]'
                    : 'border-orange-500/40 hover:border-orange-500/60'
                }`}
              >
                <span className={`absolute -top-4 left-1/2 -translate-x-1/2 bg-gray-900 px-3 text-base font-black uppercase tracking-wider whitespace-nowrap transition-colors duration-500 ${
                  expandedLayers[2] ? 'text-orange-300' : 'text-orange-400'
                }`}>
                  Layer 2 &mdash; Behavioral Engine
                </span>
                {/* L1 inner ring */}
                <div
                  onClick={(e) => { e.stopPropagation(); toggleLayer(1) }}
                  className={`relative w-full aspect-square rounded-full border-2 flex items-center justify-center cursor-pointer transition-all duration-500 ${
                    expandedLayers[1]
                      ? 'border-solid border-red-400 bg-red-500/15 shadow-[0_0_30px_rgba(239,68,68,0.3)] scale-[1.02]'
                      : 'border-solid border-red-500/60 bg-red-500/5 hover:border-red-500/80'
                  }`}
                >
                  <span className={`absolute -top-4 left-1/2 -translate-x-1/2 bg-gray-900 px-3 text-base font-black uppercase tracking-wider whitespace-nowrap transition-colors duration-500 ${
                    expandedLayers[1] ? 'text-red-300' : 'text-red-400'
                  }`}>
                    Layer 1 &mdash; On-Chain Policy
                  </span>
                  <div className="text-center px-2">
                    <div className={`font-black text-lg sm:text-xl transition-colors duration-500 ${
                      expandedLayers[1] ? 'text-red-300' : 'text-white'
                    }`}>PolicyLib.sol</div>
                    <div className={`text-base mt-1 transition-colors duration-500 ${
                      expandedLayers[1] ? 'text-red-400/80' : 'text-gray-400'
                    }`}>Immutable Rules</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Key Differentiators — stacked 1x4 on the right */}
          <div className="grid grid-cols-1 gap-3">
            {KEY_DIFFERENTIATORS.map((d) => (
              <div key={d.title} className={`${d.bg} rounded-xl p-4 border ${d.border}`}>
                <div className="flex items-center gap-2 mb-1.5">
                  <span className={`text-xl`} dangerouslySetInnerHTML={{ __html: d.icon }} />
                  <h4 className={`${d.color} font-bold text-lg`}>{d.title}</h4>
                </div>
                <p className="text-gray-300 text-base leading-relaxed">{d.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Expandable layer cards — 3 columns */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          {DEFENSE_LAYERS.map((layer) => {
            const open = !!expandedLayers[layer.layer]
            return (
              <div key={layer.layer} className={`${layer.bg} rounded-xl border border-gray-800 overflow-hidden flex flex-col`}>
                <button
                  onClick={() => toggleLayer(layer.layer)}
                  className="w-full flex items-center justify-between p-5 text-left cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <span className={`${layer.textColor} text-3xl font-black`}>L{layer.layer}</span>
                    <div>
                      <div className="text-white font-bold text-lg">{layer.name}</div>
                      <div className="text-gray-500 text-base font-mono">{layer.subtitle}</div>
                    </div>
                  </div>
                  <ChevronIcon open={open} />
                </button>
                <div
                  className={`transition-all duration-300 ease-in-out overflow-hidden ${
                    open ? 'max-h-[800px] opacity-100' : 'max-h-0 opacity-0'
                  }`}
                >
                  <div className="px-5 pb-5 border-t border-gray-800/50 pt-4">
                    <p className={`${layer.textColor} font-bold mb-3 italic text-lg`}>
                      {layer.tagline}
                    </p>
                    <ul className="space-y-2">
                      {layer.details.map((d, i) => (
                        <li key={i} className="text-gray-300 text-base flex items-start gap-2 leading-relaxed">
                          <span className={`${layer.textColor} mt-0.5 shrink-0`}>&#9654;</span>
                          {d}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </Section>

      {/* ═══════════ SECTION 4: VERDICT PIPELINE ═══════════ */}
      <Section id="pipeline" borderColor="border-l-cyan-500">
        <SectionTitle>Verdict Pipeline</SectionTitle>
        <h3 className="text-3xl font-black text-white mb-2">8-Step Verdict Flow</h3>
        <p className="text-gray-400 text-xl mb-6">
          Every agent proposal passes through this pipeline. A denial at any step halts execution and freezes the agent.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {PIPELINE_STEPS.map((s, i) => (
            <div key={s.step} className="relative">
              <div className={`${s.bg} rounded-xl p-4 border ${s.color} border-l-4 h-full`}>
                <div className="flex items-center gap-2 mb-2">
                  <span className={`${s.text} text-2xl font-black font-mono`}>{s.step}</span>
                  <span className="text-white font-bold text-lg">{s.title}</span>
                </div>
                <p className="text-gray-400 text-base mb-2">{s.desc}</p>
                <span className="inline-block text-base font-mono px-2.5 py-1 rounded bg-gray-800/80 text-gray-500">
                  {s.service}
                </span>
              </div>
              {i < PIPELINE_STEPS.length - 1 && (
                <div className="hidden lg:block absolute -right-2 top-1/2 -translate-y-1/2 z-10 text-gray-700">
                  &#9654;
                </div>
              )}
            </div>
          ))}
        </div>

      </Section>

      {/* ═══════════ SECTION 5: CHAINLINK INTEGRATIONS ═══════════ */}
      <Section id="chainlink" borderColor="border-l-blue-500">
        <SectionTitle>Chainlink Integrations</SectionTitle>
        <h3 className="text-3xl font-black text-white mb-2">7 Chainlink Services</h3>
        <p className="text-gray-400 text-xl mb-6">
          SentinelCRE is built entirely on Chainlink&apos;s CRE infrastructure. Every critical operation runs through the DON.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {CHAINLINK_INTEGRATIONS.map((svc) => (
            <div
              key={svc.name}
              className={`${svc.bg} rounded-xl p-5 border ${svc.border}`}
            >
              <div className="flex items-center justify-between mb-2">
                <h4 className={`${svc.color} font-bold text-lg`}>{svc.name}</h4>
                <span
                  className={`text-base px-3 py-1 rounded-full font-bold ${
                    svc.status === 'LIVE'
                      ? 'text-green-400 bg-green-400/15 border border-green-400/30'
                      : 'text-yellow-400 bg-yellow-400/15 border border-yellow-400/30'
                  }`}
                >
                  {svc.status}
                </span>
              </div>
              <p className="text-gray-400 text-base mb-3">{svc.desc}</p>
              <div className="flex items-center gap-1.5">
                <span className="text-gray-600 text-base">File:</span>
                <code className="text-base font-mono text-gray-500 bg-gray-800/60 px-2 py-0.5 rounded">
                  {svc.file}
                </code>
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* ═══════════ SECTION 6: SMART CONTRACTS ═══════════ */}
      <Section id="contracts" borderColor="border-l-green-500">
        <SectionTitle>Smart Contracts</SectionTitle>
        <h3 className="text-3xl font-black text-white mb-2">On-Chain Infrastructure</h3>
        <p className="text-gray-400 text-xl mb-6">
          Two battle-tested contracts with 85 passing tests across 5 test suites.
        </p>

        <div className="space-y-4">
          {(() => {
            const open = !!expandedContracts['SentinelGuardian']
            return (
              <div className="bg-gray-800/50 rounded-xl border border-gray-700/50 overflow-hidden">
                <button
                  onClick={() => toggleContract('SentinelGuardian')}
                  className="w-full p-5 text-left cursor-pointer"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <span className="text-green-400 text-xl">&#9670;</span>
                      <h4 className="font-mono text-xl text-white font-bold">SentinelGuardian.sol</h4>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-green-400 bg-green-400/10 text-base px-3 py-1 rounded-full font-bold">
                        45 tests
                      </span>
                      <ChevronIcon open={open} />
                    </div>
                  </div>
                  <div className="ml-8">
                    <p className="text-gray-300 text-lg mb-1">
                      Core risk engine &mdash; compliance checks, circuit breakers, agent lifecycle management
                    </p>
                    <div className="flex flex-wrap items-center gap-2 text-base">
                      <span className="text-gray-400 font-mono bg-gray-800 px-2.5 py-1 rounded">AccessControl</span>
                      <span className="text-gray-400 font-mono bg-gray-800 px-2.5 py-1 rounded">Pausable</span>
                    </div>
                  </div>
                </button>
                <div
                  className={`transition-all duration-300 ease-in-out overflow-hidden ${
                    open ? 'max-h-[1200px] opacity-100' : 'max-h-0 opacity-0'
                  }`}
                >
                  <div className="px-5 pb-5 border-t border-gray-700/50 pt-4 space-y-4">
                    <div className="flex items-center gap-2">
                      <span className="text-gray-500 text-base">Address:</span>
                      <code className="text-base font-mono text-cyan-400 bg-gray-800 px-2.5 py-1 rounded">
                        0x5F938e4c62991Eb4af3Dd89097978A1f376e6CC8
                      </code>
                    </div>
                    <div>
                      <div className="text-gray-400 text-base uppercase tracking-wider mb-2 font-bold">Key Functions</div>
                      <div className="flex flex-wrap gap-2">
                        {['processVerdict(bytes)', 'unfreezeAgent(bytes32)', 'getAgentPolicy(bytes32)', 'checkAll(CheckParams)'].map((fn) => (
                          <code key={fn} className="text-base font-mono text-green-400/80 bg-green-400/5 px-2.5 py-1 rounded border border-green-400/10">
                            {fn}
                          </code>
                        ))}
                      </div>
                    </div>
                    <div>
                      <div className="text-gray-400 text-base uppercase tracking-wider mb-2 font-bold">Core Logic</div>
                      <pre className="bg-gray-950 rounded-lg p-5 overflow-x-auto border border-gray-800 text-base">
                        <code className="text-gray-200 font-mono leading-relaxed whitespace-pre">{GUARDIAN_CODE}</code>
                      </pre>
                    </div>
                  </div>
                </div>
              </div>
            )
          })()}

          {(() => {
            const open = !!expandedContracts['AgentRegistry']
            return (
              <div className="bg-gray-800/50 rounded-xl border border-gray-700/50 overflow-hidden">
                <button
                  onClick={() => toggleContract('AgentRegistry')}
                  className="w-full p-5 text-left cursor-pointer"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <span className="text-blue-400 text-xl">&#9670;</span>
                      <h4 className="font-mono text-xl text-white font-bold">AgentRegistry.sol</h4>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-green-400 bg-green-400/10 text-base px-3 py-1 rounded-full font-bold">
                        8 tests
                      </span>
                      <ChevronIcon open={open} />
                    </div>
                  </div>
                  <div className="ml-8">
                    <p className="text-gray-300 text-lg mb-1">
                      Agent metadata registry &mdash; name, description, owner tracking
                    </p>
                    <div className="flex flex-wrap items-center gap-2 text-base">
                      <span className="text-gray-400 font-mono bg-gray-800 px-2.5 py-1 rounded">Ownable</span>
                    </div>
                  </div>
                </button>
                <div
                  className={`transition-all duration-300 ease-in-out overflow-hidden ${
                    open ? 'max-h-[1200px] opacity-100' : 'max-h-0 opacity-0'
                  }`}
                >
                  <div className="px-5 pb-5 border-t border-gray-700/50 pt-4 space-y-4">
                    <div className="flex items-center gap-2">
                      <span className="text-gray-500 text-base">Address:</span>
                      <code className="text-base font-mono text-cyan-400 bg-gray-800 px-2.5 py-1 rounded">
                        0xFA7deF53FEaC45dB96A5B15C32ca4E6B009b25e6
                      </code>
                    </div>
                    <div>
                      <div className="text-gray-400 text-base uppercase tracking-wider mb-2 font-bold">Key Functions</div>
                      <div className="flex flex-wrap gap-2">
                        {['registerAgent(bytes32, string, string)', 'getAgent(bytes32)', 'getAgentCount()'].map((fn) => (
                          <code key={fn} className="text-base font-mono text-blue-400/80 bg-blue-400/5 px-2.5 py-1 rounded border border-blue-400/10">
                            {fn}
                          </code>
                        ))}
                      </div>
                    </div>
                    <div>
                      <div className="text-gray-400 text-base uppercase tracking-wider mb-2 font-bold">Core Logic</div>
                      <pre className="bg-gray-950 rounded-lg p-5 overflow-x-auto border border-gray-800 text-base">
                        <code className="text-gray-200 font-mono leading-relaxed whitespace-pre">{REGISTRY_CODE}</code>
                      </pre>
                    </div>
                  </div>
                </div>
              </div>
            )
          })()}
        </div>

        <div className="mt-5 text-center">
          <span className="text-xl font-bold text-green-400">90 tests passing</span>
          <span className="text-xl text-gray-500"> across 5 test suites</span>
        </div>
      </Section>

      {/* ═══════════ SECTION 7: BEHAVIORAL DIMENSIONS ═══════════ */}
      <Section id="behavioral" borderColor="border-l-purple-500">
        <SectionTitle>Behavioral Risk Scoring</SectionTitle>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-3xl font-black text-white">7 Anomaly Dimensions</h3>
          <button
            onClick={() => setExpandedDimensions(!expandedDimensions)}
            className="text-base text-purple-400 hover:text-purple-300 transition-colors flex items-center gap-1 cursor-pointer"
          >
            {expandedDimensions ? 'Collapse examples' : 'Show examples'}
            <ChevronIcon open={expandedDimensions} />
          </button>
        </div>
        <p className="text-gray-400 text-xl mb-6">
          Each proposal is scored across 7 independent dimensions. Total max score: 230. Threshold for denial: configurable per agent policy.
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {BEHAVIORAL_DIMENSIONS.map((dim) => {
            const widthPct = Math.round((dim.max / dim.total) * 100)
            return (
              <div key={dim.name} className="bg-gray-800/50 rounded-xl border border-gray-700/50 p-5">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-white font-bold text-xl">{dim.name}</span>
                  <span className="text-gray-400 text-base font-mono font-bold">
                    max +{dim.max}
                  </span>
                </div>

                <div className="w-full bg-gray-900 rounded-full h-2.5 mb-3">
                  <div
                    className={`${dim.color} h-2.5 rounded-full transition-all duration-500`}
                    style={{ width: `${widthPct}%` }}
                  />
                </div>

                <p className="text-gray-300 text-lg leading-relaxed">{dim.desc}</p>

                <div
                  className={`transition-all duration-300 ease-in-out overflow-hidden ${
                    expandedDimensions ? 'max-h-40 opacity-100 mt-3' : 'max-h-0 opacity-0'
                  }`}
                >
                  <div className="space-y-2">
                    {dim.examples.map((ex, i) => (
                      <div key={i} className="bg-gray-900/80 rounded-lg px-4 py-3 border border-gray-800">
                        <span className="text-gray-500 text-base uppercase tracking-wider font-bold mr-2">Ex {i + 1}: </span>
                        <span className="text-gray-300 text-base italic">{ex}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        <div className="mt-4 bg-purple-500/5 border border-purple-500/20 rounded-xl p-5 text-center">
          <div className="text-purple-400 text-base font-medium">
            Combined max score:{' '}
            <span className="text-white font-black text-2xl">230</span>
            <span className="text-gray-500 ml-3">|</span>
            <span className="text-gray-400 ml-3">Typical denial threshold:</span>
            <span className="text-red-400 font-black text-2xl ml-1">50+</span>
          </div>
        </div>
      </Section>

      {/* ═══════════ SECTION 8: ECOSYSTEM POSITIONING ═══════════ */}
      <Section id="ecosystem" borderColor="border-l-yellow-500">
        <SectionTitle>Ecosystem &amp; Market Validation</SectionTitle>
        <h3 className="text-3xl font-black text-white mb-2">Risk Infrastructure for the Agentic Economy</h3>
        <p className="text-gray-400 text-xl mb-6">
          SentinelCRE isn&apos;t an application &mdash; it&apos;s the risk layer the autonomous agent economy is missing.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          {ECOSYSTEM_STATS.map((stat) => (
            <div key={stat.source} className={`${stat.bg} rounded-xl p-5 border ${stat.border}`}>
              <div className="flex items-center gap-3 mb-2">
                <span className={`${stat.color} text-3xl font-black font-mono`}>{stat.metric}</span>
                <div>
                  <div className="text-white font-bold text-lg">{stat.label}</div>
                  <div className="text-gray-500 text-base font-mono">{stat.source}</div>
                </div>
              </div>
              <p className="text-gray-300 text-lg leading-relaxed">{stat.desc}</p>
            </div>
          ))}
        </div>

        <div className="bg-yellow-500/5 border border-yellow-500/20 rounded-xl p-5 text-center">
          <p className="text-white text-xl font-medium leading-relaxed">
            The <span className="text-yellow-400 font-black">$30 trillion</span> agentic economy is being built with no risk layer.
            <span className="text-yellow-400 font-bold ml-1">We&apos;re building that layer.</span>
          </p>
        </div>
      </Section>

      {/* ═══════════ SECTION 9: PREVENTION — FULL CIRCLE ═══════════ */}
      <Section id="prevention" borderColor="border-l-cyan-500">
        <SectionTitle>Prevention Proof</SectionTitle>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-3xl sm:text-4xl font-black text-white">
            How SentinelCRE Stops Every Attack
          </h3>
          <button
            onClick={() => {
              const next = !allPreventionExpanded
              const updated: Record<string, boolean> = { ...expandedExploits }
              EXPLOITS.forEach((e) => { updated[`prevent-${e.name}`] = next })
              AI_AGENT_INCIDENTS.forEach((e) => { updated[`prevent-${e.name}`] = next })
              setExpandedExploits(updated)
            }}
            className="text-base text-cyan-400 hover:text-cyan-300 transition-colors flex items-center gap-1 cursor-pointer shrink-0"
          >
            {allPreventionExpanded ? 'Collapse all' : 'Expand all'}
            <ChevronIcon open={allPreventionExpanded} />
          </button>
        </div>
        <p className="text-gray-400 text-xl mb-6">
          All {EXPLOITS.length + AI_AGENT_INCIDENTS.length} exploits from above &mdash; historical and 2025 &mdash; but now with the 3-layer defense active. Click any to see exactly where the attack gets blocked.
        </p>

        <div className="bg-cyan-500/5 border border-cyan-500/20 rounded-xl p-5 text-center mb-6">
          <div className="text-cyan-400 text-4xl font-black mb-1">$3.7 Billion+ saved</div>
          <p className="text-gray-400 text-lg">
            Every exploit blocked before execution &mdash; $2.2B historical + $1.5B+ from 2025 incidents
          </p>
        </div>

        {/* 2025 AI Agent Incidents */}
        <div className="mb-3">
          <h4 className="text-xl font-bold text-red-400 mb-3 flex items-center gap-2">
            <span className="bg-red-500/10 text-red-400 text-sm font-black px-2.5 py-0.5 rounded-full border border-red-500/30">2025</span>
            AI Agent Incidents Prevented
          </h4>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {AI_AGENT_INCIDENTS.map((e) => {
              const open = !!expandedExploits[`prevent-${e.name}`]
              return (
                <div
                  key={e.name}
                  className={`bg-cyan-500/5 rounded-xl border-l-4 border-cyan-500 border border-gray-800 overflow-hidden`}
                >
                  <button
                    onClick={() => toggleExploit(`prevent-${e.name}`)}
                    className="w-full flex items-center justify-between p-4 text-left cursor-pointer"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="text-cyan-400 text-3xl font-black font-mono shrink-0">
                        {e.amount}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-white font-bold text-xl">{e.name}</span>
                          <span className="text-cyan-400 text-xs font-black bg-cyan-400/10 px-2 py-0.5 rounded-full border border-cyan-400/30">
                            BLOCKED
                          </span>
                        </div>
                        <div className="text-gray-400 text-lg">Stopped at: <span className="text-cyan-300 font-bold text-lg">{e.stoppedAt}</span></div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <div className="flex gap-1 flex-wrap justify-end">
                        {e.caughtBy.map((layer) => {
                          const style = LAYER_TAG_STYLES[layer]
                          return (
                            <span
                              key={layer}
                              className={`${style.bg} ${style.text} ${style.border} border text-sm font-bold px-2.5 py-0.5 rounded-full`}
                            >
                              {style.label}
                            </span>
                          )
                        })}
                      </div>
                      <ChevronIcon open={open} />
                    </div>
                  </button>
                  <div
                    className={`transition-all duration-300 ease-in-out overflow-hidden ${
                      open ? 'max-h-[600px] opacity-100' : 'max-h-0 opacity-0'
                    }`}
                  >
                    <div className="px-4 pb-4 border-t border-gray-800/50 pt-3">
                      <div className="text-cyan-300/90 text-base leading-relaxed flex items-start gap-2">
                        <span className="text-cyan-400 mt-0.5 shrink-0">{'\u2705'}</span>
                        {e.prevention}
                      </div>
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <span className="text-gray-500 text-base uppercase tracking-wider font-bold">Layers triggered:</span>
                        {e.caughtBy.map((layer) => {
                          const style = LAYER_TAG_STYLES[layer]
                          return (
                            <span
                              key={layer}
                              className={`${style.bg} ${style.text} ${style.border} border text-base font-bold px-2.5 py-0.5 rounded-full`}
                            >
                              {style.label}
                            </span>
                          )
                        })}
                      </div>
                      <div className="mt-2 bg-gray-900/60 rounded-lg px-3 py-2 border border-gray-800">
                        <span className="text-gray-500 text-base uppercase tracking-wider font-bold mr-2">Original:</span>
                        <span className="text-gray-400 text-base">{e.method} &mdash; {e.date}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Historical DeFi Exploits */}
        <div className="mb-3">
          <h4 className="text-xl font-bold text-gray-400 mb-3 flex items-center gap-2">
            <span className="bg-gray-500/10 text-gray-400 text-sm font-black px-2.5 py-0.5 rounded-full border border-gray-500/30">2021&ndash;2024</span>
            Historical DeFi Exploits Prevented
          </h4>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {EXPLOITS.map((e) => {
            const open = !!expandedExploits[`prevent-${e.name}`]
            return (
              <div
                key={e.name}
                className={`bg-cyan-500/5 rounded-xl border-l-4 border-cyan-500 border border-gray-800 overflow-hidden`}
              >
                <button
                  onClick={() => toggleExploit(`prevent-${e.name}`)}
                  className="w-full flex items-center justify-between p-4 text-left cursor-pointer"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="text-cyan-400 text-3xl font-black font-mono shrink-0">
                      {e.amount}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-white font-bold text-xl">{e.name}</span>
                        <span className="text-cyan-400 text-xs font-black bg-cyan-400/10 px-2 py-0.5 rounded-full border border-cyan-400/30">
                          BLOCKED
                        </span>
                      </div>
                      <div className="text-gray-400 text-lg">Stopped at: <span className="text-cyan-300 font-bold text-lg">{e.stoppedAt}</span></div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <div className="flex gap-1 flex-wrap justify-end">
                      {e.caughtBy.map((layer) => {
                        const style = LAYER_TAG_STYLES[layer]
                        return (
                          <span
                            key={layer}
                            className={`${style.bg} ${style.text} ${style.border} border text-sm font-bold px-2.5 py-0.5 rounded-full`}
                          >
                            {style.label}
                          </span>
                        )
                      })}
                    </div>
                    <ChevronIcon open={open} />
                  </div>
                </button>
                <div
                  className={`transition-all duration-300 ease-in-out overflow-hidden ${
                    open ? 'max-h-[600px] opacity-100' : 'max-h-0 opacity-0'
                  }`}
                >
                  <div className="px-4 pb-4 border-t border-gray-800/50 pt-3">
                    <div className="text-cyan-300/90 text-base leading-relaxed flex items-start gap-2">
                      <span className="text-cyan-400 mt-0.5 shrink-0">{'\u2705'}</span>
                      {e.prevention}
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <span className="text-gray-500 text-base uppercase tracking-wider font-bold">Layers triggered:</span>
                      {e.caughtBy.map((layer) => {
                        const style = LAYER_TAG_STYLES[layer]
                        return (
                          <span
                            key={layer}
                            className={`${style.bg} ${style.text} ${style.border} border text-base font-bold px-2.5 py-0.5 rounded-full`}
                          >
                            {style.label}
                          </span>
                        )
                      })}
                    </div>
                    <div className="mt-2 bg-gray-900/60 rounded-lg px-3 py-2 border border-gray-800">
                      <span className="text-gray-500 text-base uppercase tracking-wider font-bold mr-2">Original:</span>
                      <span className="text-gray-400 text-base">{e.method} &mdash; {e.date}</span>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
        </div>

        <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700/50 text-center">
          <p className="text-white text-xl font-medium leading-relaxed mb-3">
            Every exploit blocked. Every agent frozen. Every incident recorded on-chain.
          </p>
          <p className="text-cyan-400 text-2xl font-black">
            See it in action &rarr; Live Demo tab
          </p>
        </div>
      </Section>
    </div>
  )
}
