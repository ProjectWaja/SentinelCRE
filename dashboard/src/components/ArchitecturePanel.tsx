'use client'

import { useState } from 'react'

/* ─────────────── Table of Contents Sections ─────────────── */
const TOC = [
  { id: 'problem', label: 'Problem', color: 'text-red-400' },
  { id: 'defense', label: 'Defense Model', color: 'text-orange-400' },
  { id: 'pipeline', label: 'Pipeline', color: 'text-cyan-400' },
  { id: 'chainlink', label: 'Chainlink', color: 'text-blue-400' },
  { id: 'contracts', label: 'Contracts', color: 'text-green-400' },
  { id: 'behavioral', label: 'Behavioral', color: 'text-purple-400' },
  { id: 'techstack', label: 'Stack', color: 'text-gray-400' },
]

/* ─────────────── Data ─────────────── */

const EXPLOITS = [
  {
    name: 'Ronin Bridge',
    amount: '$625M',
    date: 'Mar 2022',
    method: 'Compromised validator keys',
    color: 'border-red-500',
    bg: 'bg-red-500/5',
  },
  {
    name: 'Wormhole',
    amount: '$320M',
    date: 'Feb 2022',
    method: 'Forged guardian signatures',
    color: 'border-orange-500',
    bg: 'bg-orange-500/5',
  },
  {
    name: 'Mango Markets',
    amount: '$114M',
    date: 'Oct 2022',
    method: 'Oracle manipulation',
    color: 'border-yellow-500',
    bg: 'bg-yellow-500/5',
  },
]

const DEFENSE_LAYERS = [
  {
    layer: 1,
    name: 'On-Chain Policy',
    subtitle: 'PolicyLib.sol',
    color: 'red',
    ringColor: 'border-red-500',
    bg: 'bg-red-500/10',
    textColor: 'text-red-400',
    tagline: 'Immutable rules that can\'t be bypassed',
    details: [
      'Value limits per transaction and per window',
      'Target address whitelist enforcement',
      'Function selector blocklist',
      'Rate limiting (max actions per time window)',
      'Mint cap enforcement (absolute token ceiling)',
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
  {
    step: 1,
    title: 'Receive Proposal',
    desc: 'Agent submits action',
    service: 'CRE HTTP Trigger',
    color: 'border-blue-500',
    bg: 'bg-blue-500/10',
    text: 'text-blue-400',
  },
  {
    step: 2,
    title: 'Read Policy',
    desc: 'Fetch on-chain rules',
    service: 'CRE EVMClient',
    color: 'border-cyan-500',
    bg: 'bg-cyan-500/10',
    text: 'text-cyan-400',
  },
  {
    step: 3,
    title: 'Behavioral Scoring',
    desc: '7-dimension anomaly check',
    service: 'CRE Workflow',
    color: 'border-orange-500',
    bg: 'bg-orange-500/10',
    text: 'text-orange-400',
  },
  {
    step: 4,
    title: 'AI Model 1 (Claude)',
    desc: 'Independent risk evaluation',
    service: 'Confidential HTTP',
    color: 'border-purple-500',
    bg: 'bg-purple-500/10',
    text: 'text-purple-400',
  },
  {
    step: 5,
    title: 'AI Model 2 (GPT-4)',
    desc: 'Independent risk evaluation',
    service: 'Confidential HTTP',
    color: 'border-violet-500',
    bg: 'bg-violet-500/10',
    text: 'text-violet-400',
  },
  {
    step: 6,
    title: 'DON Consensus',
    desc: 'Aggregate and verify',
    service: 'CRE Consensus',
    color: 'border-yellow-500',
    bg: 'bg-yellow-500/10',
    text: 'text-yellow-400',
  },
  {
    step: 7,
    title: 'Write Verdict',
    desc: 'Record on-chain',
    service: 'CRE EVMClient',
    color: 'border-green-500',
    bg: 'bg-green-500/10',
    text: 'text-green-400',
  },
  {
    step: 8,
    title: 'Enforcement',
    desc: 'Freeze/approve agent',
    service: 'SentinelGuardian.sol',
    color: 'border-emerald-500',
    bg: 'bg-emerald-500/10',
    text: 'text-emerald-400',
  },
]

const CHAINLINK_INTEGRATIONS = [
  {
    name: 'CRE Workflow Engine',
    desc: 'HTTP + Cron triggers orchestrate the full verdict pipeline end-to-end.',
    status: 'LIVE',
    file: 'sentinel-workflow/main.ts',
    color: 'text-blue-400',
    bg: 'bg-blue-400/10',
    border: 'border-blue-400/30',
  },
  {
    name: 'CRE HTTPClient',
    desc: 'Calls Claude and GPT-4 for independent dual-AI risk evaluation with ConsensusAggregationByFields.',
    status: 'LIVE',
    file: 'sentinel-workflow/main.ts',
    color: 'text-cyan-400',
    bg: 'bg-cyan-400/10',
    border: 'border-cyan-400/30',
  },
  {
    name: 'CRE EVMClient',
    desc: 'Reads agent policies from SentinelGuardian and writes signed verdicts on-chain.',
    status: 'LIVE',
    file: 'sentinel-workflow/main.ts',
    color: 'text-green-400',
    bg: 'bg-green-400/10',
    border: 'border-green-400/30',
  },
  {
    name: 'CRE CronCapability',
    desc: 'Periodic health sweeps detect anomalous agents and auto-freeze them between proposals.',
    status: 'LIVE',
    file: 'sentinel-workflow/main.ts',
    color: 'text-yellow-400',
    bg: 'bg-yellow-400/10',
    border: 'border-yellow-400/30',
  },
  {
    name: 'Confidential HTTP',
    desc: 'Hides AI API keys and guardrail thresholds from DON node operators during evaluation.',
    status: 'READY',
    file: 'sentinel-workflow/main.ts',
    color: 'text-purple-400',
    bg: 'bg-purple-400/10',
    border: 'border-purple-400/30',
  },
  {
    name: 'Confidential Compute',
    desc: 'Hides policy parameters from AI agents to prevent adversarial gaming of thresholds.',
    status: 'READY',
    file: 'planned',
    color: 'text-orange-400',
    bg: 'bg-orange-400/10',
    border: 'border-orange-400/30',
  },
  {
    name: 'Behavioral Risk Engine',
    desc: 'Custom 7-dimension anomaly detection scoring system running inside CRE workflow.',
    status: 'LIVE',
    file: 'api-server/server.ts',
    color: 'text-rose-400',
    bg: 'bg-rose-400/10',
    border: 'border-rose-400/30',
  },
]

const BEHAVIORAL_DIMENSIONS = [
  {
    name: 'Value Deviation',
    max: 25,
    total: 155,
    desc: 'Flags transactions significantly above the agent\'s historical average',
    example: 'Agent usually sends 0.1 ETH, suddenly tries 50 ETH',
    color: 'bg-red-500',
  },
  {
    name: 'Contract Diversity',
    max: 20,
    total: 155,
    desc: 'Detects when agent suddenly interacts with unknown contracts',
    example: 'DeFi agent starts calling NFT minting contracts',
    color: 'bg-orange-500',
  },
  {
    name: 'Velocity',
    max: 15,
    total: 155,
    desc: 'Catches burst-rate transactions faster than the agent\'s baseline',
    example: '20 transactions in 60 seconds vs. normal 2/minute',
    color: 'bg-yellow-500',
  },
  {
    name: 'Function Pattern',
    max: 30,
    total: 155,
    desc: 'Identifies unusual function calls for this agent type',
    example: 'Swap agent calling approve() on an unknown token',
    color: 'bg-purple-500',
  },
  {
    name: 'Time-of-Day',
    max: 10,
    total: 155,
    desc: 'Flags activity outside the agent\'s normal operating hours',
    example: 'Business-hours agent active at 3 AM UTC',
    color: 'bg-blue-500',
  },
  {
    name: 'Sequential Probing',
    max: 35,
    total: 155,
    desc: 'Detects monotonically increasing values (threshold hunting)',
    example: 'Agent sends 1, 2, 4, 8, 16 ETH probing for limits',
    color: 'bg-pink-500',
  },
  {
    name: 'Cumulative Drift',
    max: 20,
    total: 155,
    desc: 'Catches slow baseline poisoning over many transactions',
    example: 'Gradually increasing average over 100 small transactions',
    color: 'bg-teal-500',
  },
]

const TECH_BADGES = [
  'Solidity 0.8.24',
  'Foundry',
  'CRE SDK (TypeScript)',
  'Bun',
  'Next.js 15',
  'Tenderly Virtual TestNet',
  'viem',
  'Tailwind 4',
]

const TECH_STATS = [
  { label: '61 tests', sublabel: 'Forge', color: 'text-green-400' },
  { label: '14 scenarios', sublabel: 'Demo', color: 'text-cyan-400' },
  { label: '2 AI models', sublabel: 'Claude + GPT-4', color: 'text-purple-400' },
  { label: '7 dimensions', sublabel: 'Behavioral', color: 'text-orange-400' },
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
    <h2 className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-4">
      {children}
    </h2>
  )
}

/* ═══════════════ MAIN COMPONENT ═══════════════ */

export default function ArchitecturePanel() {
  const [expandedLayers, setExpandedLayers] = useState<Record<number, boolean>>({})
  const [expandedContracts, setExpandedContracts] = useState<Record<string, boolean>>({})
  const [expandedDimensions, setExpandedDimensions] = useState(false)

  const toggleLayer = (layer: number) =>
    setExpandedLayers((prev) => ({ ...prev, [layer]: !prev[layer] }))
  const toggleContract = (name: string) =>
    setExpandedContracts((prev) => ({ ...prev, [name]: !prev[name] }))

  return (
    <div className="space-y-6">
      {/* ─── Table of Contents ─── */}
      <nav className="bg-gray-900/80 backdrop-blur-sm rounded-xl border border-gray-800 px-4 py-3 sticky top-36 z-30">
        <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide">
          <span className="text-gray-600 text-xs font-mono uppercase tracking-wider mr-2 shrink-0">Jump to:</span>
          {TOC.map((t) => (
            <a
              key={t.id}
              href={`#${t.id}`}
              className={`${t.color} text-xs font-semibold px-2.5 py-1 rounded-md hover:bg-gray-800 transition-colors whitespace-nowrap`}
            >
              {t.label}
            </a>
          ))}
        </div>
      </nav>

      {/* ═══════════ SECTION 1: PROBLEM STATEMENT ═══════════ */}
      <Section id="problem" borderColor="border-l-red-500">
        <SectionTitle>Problem Statement</SectionTitle>
        <h3 className="text-3xl sm:text-4xl font-black text-white mb-2">
          Why SentinelCRE Exists
        </h3>
        <p className="text-gray-400 text-lg mb-6">
          Autonomous AI agents are the next frontier of DeFi. They are also the next frontier of DeFi exploits.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          {EXPLOITS.map((e) => (
            <div
              key={e.name}
              className={`${e.bg} rounded-xl p-5 border-l-4 ${e.color} border border-gray-800`}
            >
              <div className="flex items-baseline justify-between mb-1">
                <span className="text-white font-bold text-lg">{e.name}</span>
                <span className="text-gray-500 text-sm font-mono">{e.date}</span>
              </div>
              <div className="text-red-400 text-2xl font-black mb-2">{e.amount}</div>
              <p className="text-gray-400 text-sm">{e.method}</p>
            </div>
          ))}
        </div>

        <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-5 text-center">
          <div className="text-red-400 text-3xl font-black mb-1">$2B+ lost</div>
          <p className="text-gray-400">
            to autonomous agent exploits in 2021&ndash;2024
          </p>
        </div>

        <div className="mt-6 bg-gray-800/50 rounded-xl p-5 border border-gray-700/50">
          <p className="text-white text-lg font-medium text-center leading-relaxed">
            SentinelCRE is a decentralized AI sentinel that prevents these attacks{' '}
            <span className="text-cyan-400 font-bold">before they execute</span>.
          </p>
        </div>
      </Section>

      {/* ═══════════ SECTION 2: THREE-LAYER DEFENSE ═══════════ */}
      <Section id="defense" borderColor="border-l-orange-500">
        <SectionTitle>Three-Layer Defense Model</SectionTitle>
        <h3 className="text-2xl font-black text-white mb-2">Defense in Depth</h3>
        <p className="text-gray-400 mb-6">
          Three concentric layers of protection. An attacker must bypass all three simultaneously to succeed.
        </p>

        {/* Concentric rings visual */}
        <div className="relative flex items-center justify-center mb-8 py-4">
          {/* Layer 3 ring (outermost) */}
          <div className="relative w-full max-w-lg aspect-square rounded-full border-2 border-dashed border-purple-500/40 flex items-center justify-center p-6 sm:p-10">
            <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gray-900 px-3 text-purple-400 text-xs font-bold uppercase tracking-wider">
              Layer 3 &mdash; Dual-AI Consensus
            </span>
            {/* Layer 2 ring */}
            <div className="relative w-full aspect-square rounded-full border-2 border-dashed border-orange-500/40 flex items-center justify-center p-6 sm:p-8">
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gray-900 px-3 text-orange-400 text-xs font-bold uppercase tracking-wider whitespace-nowrap">
                Layer 2 &mdash; Behavioral Engine
              </span>
              {/* Layer 1 ring (innermost) */}
              <div className="relative w-full aspect-square rounded-full border-2 border-solid border-red-500/60 flex items-center justify-center bg-red-500/5">
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gray-900 px-3 text-red-400 text-xs font-bold uppercase tracking-wider whitespace-nowrap">
                  Layer 1 &mdash; On-Chain Policy
                </span>
                <div className="text-center px-2">
                  <div className="text-white font-bold text-sm sm:text-base">PolicyLib.sol</div>
                  <div className="text-gray-500 text-xs mt-1">Immutable Rules</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Expandable layer cards */}
        <div className="space-y-3">
          {DEFENSE_LAYERS.map((layer) => {
            const open = !!expandedLayers[layer.layer]
            return (
              <div key={layer.layer} className={`${layer.bg} rounded-xl border border-gray-800 overflow-hidden`}>
                <button
                  onClick={() => toggleLayer(layer.layer)}
                  className="w-full flex items-center justify-between p-5 text-left cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <span className={`${layer.textColor} text-2xl font-black`}>L{layer.layer}</span>
                    <div>
                      <div className="text-white font-bold text-lg">{layer.name}</div>
                      <div className="text-gray-500 text-sm font-mono">{layer.subtitle}</div>
                    </div>
                  </div>
                  <ChevronIcon open={open} />
                </button>
                <div
                  className={`transition-all duration-300 ease-in-out overflow-hidden ${
                    open ? 'max-h-[600px] opacity-100' : 'max-h-0 opacity-0'
                  }`}
                >
                  <div className="px-5 pb-5 border-t border-gray-800/50 pt-4">
                    <p className={`${layer.textColor} font-medium mb-3 italic`}>
                      &ldquo;{layer.tagline}&rdquo;
                    </p>
                    <ul className="space-y-1.5">
                      {layer.details.map((d, i) => (
                        <li key={i} className="text-gray-400 text-sm flex items-start gap-2">
                          <span className={`${layer.textColor} mt-0.5`}>&#9654;</span>
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

      {/* ═══════════ SECTION 3: VERDICT PIPELINE ═══════════ */}
      <Section id="pipeline" borderColor="border-l-cyan-500">
        <SectionTitle>Verdict Pipeline</SectionTitle>
        <h3 className="text-2xl font-black text-white mb-2">8-Step Verdict Flow</h3>
        <p className="text-gray-400 mb-6">
          Every agent proposal passes through this pipeline. A denial at any step halts execution and freezes the agent.
        </p>

        {/* Pipeline steps */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {PIPELINE_STEPS.map((s, i) => (
            <div key={s.step} className="relative">
              <div className={`${s.bg} rounded-xl p-4 border ${s.color} border-l-4 h-full`}>
                <div className="flex items-center gap-2 mb-2">
                  <span className={`${s.text} text-xl font-black font-mono`}>{s.step}</span>
                  <span className="text-white font-bold text-sm">{s.title}</span>
                </div>
                <p className="text-gray-400 text-sm mb-2">{s.desc}</p>
                <span className="inline-block text-xs font-mono px-2 py-0.5 rounded bg-gray-800/80 text-gray-500">
                  {s.service}
                </span>
              </div>
              {/* Arrow between steps (hidden on last of each row) */}
              {i < PIPELINE_STEPS.length - 1 && (
                <div className="hidden lg:block absolute -right-2 top-1/2 -translate-y-1/2 z-10 text-gray-700">
                  &#9654;
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Denied highlight example */}
        <div className="mt-4 bg-red-500/5 border border-red-500/20 rounded-xl p-4 flex items-start gap-3">
          <span className="text-red-500 text-lg mt-0.5">&#9888;</span>
          <div>
            <div className="text-red-400 font-bold text-sm mb-1">When a proposal is DENIED</div>
            <p className="text-gray-400 text-sm">
              The verdict includes which step caught the attack (e.g., Step 3 behavioral anomaly, Step 4 AI rejection).
              The agent is immediately frozen and an incident is recorded on-chain with full context.
            </p>
          </div>
        </div>
      </Section>

      {/* ═══════════ SECTION 4: CHAINLINK INTEGRATIONS ═══════════ */}
      <Section id="chainlink" borderColor="border-l-blue-500">
        <SectionTitle>Chainlink Integrations</SectionTitle>
        <h3 className="text-2xl font-black text-white mb-2">7 Chainlink Services</h3>
        <p className="text-gray-400 mb-6">
          SentinelCRE is built entirely on Chainlink&apos;s CRE infrastructure. Every critical operation runs through the DON.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {CHAINLINK_INTEGRATIONS.map((svc) => (
            <div
              key={svc.name}
              className={`${svc.bg} rounded-xl p-5 border ${svc.border}`}
            >
              <div className="flex items-center justify-between mb-2">
                <h4 className={`${svc.color} font-bold text-base`}>{svc.name}</h4>
                <span
                  className={`text-xs px-2.5 py-1 rounded-full font-bold ${
                    svc.status === 'LIVE'
                      ? 'text-green-400 bg-green-400/15 border border-green-400/30'
                      : 'text-yellow-400 bg-yellow-400/15 border border-yellow-400/30'
                  }`}
                >
                  {svc.status}
                </span>
              </div>
              <p className="text-gray-400 text-sm mb-3">{svc.desc}</p>
              <div className="flex items-center gap-1.5">
                <span className="text-gray-600 text-xs">File:</span>
                <code className="text-xs font-mono text-gray-500 bg-gray-800/60 px-2 py-0.5 rounded">
                  {svc.file}
                </code>
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* ═══════════ SECTION 5: SMART CONTRACTS ═══════════ */}
      <Section id="contracts" borderColor="border-l-green-500">
        <SectionTitle>Smart Contracts</SectionTitle>
        <h3 className="text-2xl font-black text-white mb-2">On-Chain Infrastructure</h3>
        <p className="text-gray-400 mb-6">
          Two battle-tested contracts with 61 passing tests across 3 test suites.
        </p>

        <div className="space-y-4">
          {/* SentinelGuardian.sol */}
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
                      <span className="text-green-400 text-lg">&#9670;</span>
                      <h4 className="font-mono text-lg text-white font-bold">SentinelGuardian.sol</h4>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-green-400 bg-green-400/10 text-xs px-2.5 py-1 rounded-full font-bold">
                        41 tests
                      </span>
                      <ChevronIcon open={open} />
                    </div>
                  </div>
                  <div className="ml-8">
                    <p className="text-gray-400 text-sm mb-1">
                      Core risk engine &mdash; compliance checks, circuit breakers, agent lifecycle management
                    </p>
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span className="text-gray-500 font-mono bg-gray-800 px-2 py-0.5 rounded">AccessControl</span>
                      <span className="text-gray-500 font-mono bg-gray-800 px-2 py-0.5 rounded">Pausable</span>
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
                      <span className="text-gray-600 text-xs">Address:</span>
                      <code className="text-xs font-mono text-cyan-400 bg-gray-800 px-2 py-0.5 rounded">
                        0x5F938e4c62991Eb4af3Dd89097978A1f376e6CC8
                      </code>
                    </div>
                    <div>
                      <div className="text-gray-500 text-xs uppercase tracking-wider mb-2">Key Functions</div>
                      <div className="flex flex-wrap gap-2">
                        {['processVerdict(bytes)', 'unfreezeAgent(bytes32)', 'getAgentPolicy(bytes32)', 'checkAll(CheckParams)'].map((fn) => (
                          <code key={fn} className="text-xs font-mono text-green-400/80 bg-green-400/5 px-2 py-1 rounded border border-green-400/10">
                            {fn}
                          </code>
                        ))}
                      </div>
                    </div>
                    <div>
                      <div className="text-gray-500 text-xs uppercase tracking-wider mb-2">Core Logic</div>
                      <pre className="bg-gray-950 rounded-lg p-4 overflow-x-auto border border-gray-800 text-xs">
                        <code className="text-gray-300 font-mono leading-relaxed whitespace-pre">{GUARDIAN_CODE}</code>
                      </pre>
                    </div>
                  </div>
                </div>
              </div>
            )
          })()}

          {/* AgentRegistry.sol */}
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
                      <span className="text-blue-400 text-lg">&#9670;</span>
                      <h4 className="font-mono text-lg text-white font-bold">AgentRegistry.sol</h4>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-green-400 bg-green-400/10 text-xs px-2.5 py-1 rounded-full font-bold">
                        20 tests
                      </span>
                      <ChevronIcon open={open} />
                    </div>
                  </div>
                  <div className="ml-8">
                    <p className="text-gray-400 text-sm mb-1">
                      Agent metadata registry &mdash; name, description, owner tracking
                    </p>
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span className="text-gray-500 font-mono bg-gray-800 px-2 py-0.5 rounded">Ownable</span>
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
                      <span className="text-gray-600 text-xs">Address:</span>
                      <code className="text-xs font-mono text-cyan-400 bg-gray-800 px-2 py-0.5 rounded">
                        0xFA7deF53FEaC45dB96A5B15C32ca4E6B009b25e6
                      </code>
                    </div>
                    <div>
                      <div className="text-gray-500 text-xs uppercase tracking-wider mb-2">Key Functions</div>
                      <div className="flex flex-wrap gap-2">
                        {['registerAgent(bytes32, string, string)', 'getAgent(bytes32)', 'getAgentCount()'].map((fn) => (
                          <code key={fn} className="text-xs font-mono text-blue-400/80 bg-blue-400/5 px-2 py-1 rounded border border-blue-400/10">
                            {fn}
                          </code>
                        ))}
                      </div>
                    </div>
                    <div>
                      <div className="text-gray-500 text-xs uppercase tracking-wider mb-2">Core Logic</div>
                      <pre className="bg-gray-950 rounded-lg p-4 overflow-x-auto border border-gray-800 text-xs">
                        <code className="text-gray-300 font-mono leading-relaxed whitespace-pre">{REGISTRY_CODE}</code>
                      </pre>
                    </div>
                  </div>
                </div>
              </div>
            )
          })()}
        </div>

        <div className="mt-5 text-center">
          <span className="text-lg font-bold text-green-400">61 tests passing</span>
          <span className="text-lg text-gray-500"> across 3 test suites</span>
        </div>
      </Section>

      {/* ═══════════ SECTION 6: BEHAVIORAL DIMENSIONS ═══════════ */}
      <Section id="behavioral" borderColor="border-l-purple-500">
        <SectionTitle>Behavioral Risk Scoring</SectionTitle>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-2xl font-black text-white">7 Anomaly Dimensions</h3>
          <button
            onClick={() => setExpandedDimensions(!expandedDimensions)}
            className="text-sm text-purple-400 hover:text-purple-300 transition-colors flex items-center gap-1 cursor-pointer"
          >
            {expandedDimensions ? 'Collapse details' : 'Expand details'}
            <ChevronIcon open={expandedDimensions} />
          </button>
        </div>
        <p className="text-gray-400 mb-6">
          Each proposal is scored across 7 independent dimensions. Total max score: 155. Threshold for denial: configurable per agent policy.
        </p>

        <div className="space-y-3">
          {BEHAVIORAL_DIMENSIONS.map((dim) => {
            const widthPct = Math.round((dim.max / dim.total) * 100)
            return (
              <div key={dim.name} className="bg-gray-800/50 rounded-xl border border-gray-700/50 p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <span className="text-white font-bold text-sm">{dim.name}</span>
                  </div>
                  <span className="text-gray-500 text-xs font-mono">
                    max +{dim.max}
                  </span>
                </div>

                {/* Weight bar */}
                <div className="w-full bg-gray-900 rounded-full h-2 mb-2">
                  <div
                    className={`${dim.color} h-2 rounded-full transition-all duration-500`}
                    style={{ width: `${widthPct}%` }}
                  />
                </div>

                <p className="text-gray-400 text-sm">{dim.desc}</p>

                {/* Expandable example */}
                <div
                  className={`transition-all duration-300 ease-in-out overflow-hidden ${
                    expandedDimensions ? 'max-h-20 opacity-100 mt-2' : 'max-h-0 opacity-0'
                  }`}
                >
                  <div className="bg-gray-900/80 rounded-lg px-3 py-2 border border-gray-800">
                    <span className="text-gray-600 text-xs uppercase tracking-wider">Example: </span>
                    <span className="text-gray-400 text-xs italic">{dim.example}</span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Scoring summary */}
        <div className="mt-4 bg-purple-500/5 border border-purple-500/20 rounded-xl p-4 text-center">
          <div className="text-purple-400 text-sm font-medium">
            Combined max score:{' '}
            <span className="text-white font-black text-lg">155</span>
            <span className="text-gray-500 ml-3">|</span>
            <span className="text-gray-400 ml-3">Typical denial threshold:</span>
            <span className="text-red-400 font-black text-lg ml-1">50+</span>
          </div>
        </div>
      </Section>

      {/* ═══════════ SECTION 7: TECHNOLOGY STACK ═══════════ */}
      <Section id="techstack" borderColor="border-l-gray-500">
        <SectionTitle>Technology Stack</SectionTitle>
        <h3 className="text-2xl font-black text-white mb-6">Built With</h3>

        <div className="flex flex-wrap gap-2 mb-6">
          {TECH_BADGES.map((badge) => (
            <span
              key={badge}
              className="text-sm font-mono text-gray-300 bg-gray-800 px-3 py-1.5 rounded-lg border border-gray-700"
            >
              {badge}
            </span>
          ))}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {TECH_STATS.map((stat) => (
            <div key={stat.label} className="bg-gray-800/50 rounded-xl p-4 border border-gray-700/50 text-center">
              <div className={`${stat.color} text-xl font-black`}>{stat.label}</div>
              <div className="text-gray-500 text-xs mt-1">{stat.sublabel}</div>
            </div>
          ))}
        </div>
      </Section>
    </div>
  )
}
