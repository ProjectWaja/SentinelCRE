# SentinelCRE Integration Guide

How to integrate SentinelCRE into your autonomous agent infrastructure — from proof-of-concept to production deployment.

---

## Who This Is For

SentinelCRE is designed for any organization running autonomous AI agents that execute on-chain transactions. If your agents can move funds, mint tokens, or interact with smart contracts without human approval, SentinelCRE acts as a pre-execution firewall.

**Common integration scenarios:**
- **DeFi protocols** — Guard rebalancing bots, liquidation agents, and yield optimizers against compromise or drift
- **Stablecoin issuers** — Enforce mint caps and Proof of Reserves collateral ratios before any minting operation
- **DAOs** — Restrict governance agents to approved contracts and function selectors, with daily volume caps
- **Custodians & exchanges** — Rate-limit withdrawal agents and flag anomalous transaction patterns before execution
- **AI agent platforms** — Provide guardrails as a service for third-party agents running on your infrastructure

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│  YOUR AGENT INFRASTRUCTURE                                          │
│                                                                     │
│  Agent decides to execute on-chain action                           │
│       │                                                             │
│       ▼                                                             │
│  Build ActionProposal JSON (agentId, target, value, calldata...)    │
│       │                                                             │
│       ▼                                                             │
│  POST proposal to CRE Workflow HTTP trigger ◄── You build this      │
│       │                                                             │
└───────┼─────────────────────────────────────────────────────────────┘
        │
┌───────▼─────────────────────────────────────────────────────────────┐
│  SENTINELCRE (runs on Chainlink DON)                                │
│                                                                     │
│  1. EVMClient.callContract()  → Read agent policy from Guardian     │
│  2. analyzeAll()              → 7-dimension behavioral scoring      │
│  3. HTTPClient × 2            → Dual-AI evaluation (Claude + GPT-4) │
│  4. ConsensusAggregation      → BFT consensus across DON nodes      │
│  5. EVMClient.writeReport()   → Write verdict on-chain              │
│                                                                     │
│  Returns: { consensus, anomalyScore, model1, model2, severity }     │
│                                                                     │
└───────┬─────────────────────────────────────────────────────────────┘
        │
┌───────▼─────────────────────────────────────────────────────────────┐
│  YOUR AGENT INFRASTRUCTURE                                          │
│                                                                     │
│  if (verdict.consensus === "APPROVED") {                            │
│      execute the transaction                                        │
│  } else {                                                           │
│      log denial, alert ops team, optionally challenge               │
│  }                                                                  │
└─────────────────────────────────────────────────────────────────────┘
```

**Three independent defense layers — an attacker must bypass all three simultaneously:**

| Layer | Where It Runs | What It Checks | Can an Agent See It? |
|-------|---------------|----------------|---------------------|
| **L1 — On-chain policy** | SentinelGuardian contract | Value caps, contract whitelists, function blocklists, rate limits, mint caps, daily volume, Proof of Reserves | Yes — policy is public on-chain (transparent compliance) |
| **L2 — Behavioral scoring** | CRE workflow (WASM) | 7 anomaly dimensions: value deviation, contract diversity, velocity, function pattern, time-of-day, sequential probing, cumulative drift | No — weights and thresholds run inside TEE |
| **L3 — Dual-AI consensus** | CRE workflow via ConfidentialHTTPClient | Two independent AI models evaluate context, history, and behavioral signals; both must approve | No — prompts, API keys, and reasoning stay inside TEE |

---

## How Companies Actually Use It

### Pattern 1: Pre-Execution Gate (Most Common)

The agent submits every proposed action to SentinelCRE before execution. This is a synchronous call — the agent blocks until a verdict is returned.

```typescript
// Your agent's transaction execution wrapper
async function executeWithGuardian(action: AgentAction) {
  // 1. Build proposal from the action your agent wants to take
  const proposal = {
    agentId: MY_AGENT_ID,                        // bytes32 hex
    targetContract: action.to,                    // target address
    functionSignature: action.data.slice(0, 10),  // first 4 bytes
    value: action.value.toString(),               // wei as string
    mintAmount: action.mintAmount?.toString() ?? '0',
    calldata: action.data,
    description: action.description,
    // Behavioral context — YOU maintain this state
    recentValues: agentProfile.lastNValues,       // ETH floats
    recentTimestamps: agentProfile.lastNTimestamps,
    knownContracts: agentProfile.knownContracts,
    commonFunctions: agentProfile.commonFunctions,
  }

  // 2. Submit to SentinelCRE
  const verdict = await fetch(CRE_TRIGGER_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(proposal),
  }).then(r => r.json())

  // 3. Gate execution on approval
  if (verdict.consensus === 'APPROVED') {
    const tx = await wallet.sendTransaction(action)
    // Update behavioral profile after successful execution
    agentProfile.recordAction(action)
    return tx
  }

  // 4. Handle denial
  logger.warn(`DENIED: ${verdict.model1.reason}`)
  logger.warn(`Anomaly score: ${verdict.anomalyScore}/100`)
  alertOpsTeam(verdict)

  // 5. Optionally challenge if not critical severity
  if (verdict.severity !== 'CRITICAL' && verdict.challengeWindowExpiry) {
    // Challenge within the window (Low = 1hr, Medium = 30min)
    // guardian.challengeVerdict(agentId) — requires CHALLENGER_ROLE
  }

  return null
}
```

### Pattern 2: Batch Evaluation (High-Throughput Agents)

For agents that generate many actions per minute, evaluate in batches to reduce latency:

```typescript
async function evaluateBatch(actions: AgentAction[]) {
  const verdicts = await Promise.all(
    actions.map(action => evaluateWithSentinel(action))
  )

  const approved = actions.filter((_, i) => verdicts[i].consensus === 'APPROVED')
  const denied = actions.filter((_, i) => verdicts[i].consensus === 'DENIED')

  // Execute approved actions
  for (const action of approved) {
    await wallet.sendTransaction(action)
  }

  // Log and alert on denied
  if (denied.length > 0) {
    alertOpsTeam({ denied, verdicts: verdicts.filter(v => v.consensus === 'DENIED') })
  }
}
```

### Pattern 3: Multi-Agent Fleet Management

Organizations running multiple agents register each with tailored policies:

```typescript
// Register a fleet of agents with role-specific policies
const agents = [
  {
    name: 'TradingBot',
    id: keccak256('YourOrg-TradingBot-v1'),
    policy: {
      maxTransactionValue: parseEther('5'),
      maxDailyVolume: parseEther('50'),
      maxMintAmount: 0n,
      rateLimit: 50n,
      rateLimitWindow: 3600n,           // 50 per hour
      approvedContracts: [UNISWAP_ROUTER, SUSHI_ROUTER],
      blockedFunctions: [UPGRADE_TO, TRANSFER_OWNERSHIP],
      requireMultiAiConsensus: true,
      isActive: true,
      reserveFeed: zeroAddress,
      minReserveRatio: 0n,
      maxStaleness: 0n,
    }
  },
  {
    name: 'MintBot',
    id: keccak256('YourOrg-MintBot-v1'),
    policy: {
      maxTransactionValue: 0n,           // cannot move ETH
      maxDailyVolume: 0n,
      maxMintAmount: parseEther('10000000'),  // 10M tokens per tx
      rateLimit: 20n,
      rateLimitWindow: 86400n,           // 20 per day
      approvedContracts: [STABLECOIN_CONTRACT],
      blockedFunctions: [TRANSFER_OWNERSHIP, UPGRADE_TO],
      requireMultiAiConsensus: true,
      isActive: true,
      reserveFeed: CHAINLINK_POR_FEED,   // Proof of Reserves
      minReserveRatio: 12000n,           // 120% collateral required
      maxStaleness: 3600n,              // feed data < 1 hour old
    }
  }
]
```

### Pattern 4: Event-Driven Monitoring Dashboard

Subscribe to SentinelGuardian events for real-time monitoring:

```typescript
import { createPublicClient, http, parseAbiItem } from 'viem'

const client = createPublicClient({ chain: sepolia, transport: http(RPC_URL) })

// Watch for denials in real-time
client.watchContractEvent({
  address: GUARDIAN_ADDRESS,
  event: parseAbiItem('event ActionDenied(bytes32 indexed agentId, address target, uint256 value, string reason, uint256 timestamp)'),
  onLogs: (logs) => {
    for (const log of logs) {
      alertSlack(`Agent ${log.args.agentId} DENIED — ${log.args.reason}`)
    }
  }
})

// Watch for circuit breaker triggers (agent frozen)
client.watchContractEvent({
  address: GUARDIAN_ADDRESS,
  event: parseAbiItem('event AgentFrozen(bytes32 indexed agentId, uint256 timestamp)'),
  onLogs: (logs) => {
    for (const log of logs) {
      pagerDuty(`CRITICAL: Agent ${log.args.agentId} FROZEN`)
    }
  }
})
```

---

## Step-by-Step Integration

### Step 1: Deploy Smart Contracts

**Prerequisites:**
- [Foundry](https://book.getfoundry.sh/) installed
- Deployer wallet with testnet ETH (or Tenderly Virtual TestNet — no funds needed)
- RPC endpoint

```bash
cd contracts

export DEPLOYER_PRIVATE_KEY=0x<your_key>

# Deploy SentinelGuardian + AgentRegistry
forge script script/Deploy.s.sol:Deploy \
  --broadcast \
  --rpc-url <your_rpc_url>
```

This deploys two contracts:
- **SentinelGuardian** — Verdict processing, policy enforcement, circuit breaker, challenge/appeal
- **AgentRegistry** — Agent metadata store (name, description, owner)

Save the deployed addresses — you'll need them for CRE workflow config.

### Step 2: Register Your Agents

Each agent needs a policy registered in SentinelGuardian. Policies are enforced on-chain — no AI model can override them.

**Two transactions per agent:**

```solidity
// Transaction 1: Register policy in SentinelGuardian (DEFAULT_ADMIN_ROLE required)
bytes32 agentId = keccak256(abi.encodePacked("YourCompany", "TradingBot", "v1"));

AgentPolicy memory policy = AgentPolicy({
    maxTransactionValue: 1 ether,
    maxDailyVolume: 10 ether,
    maxMintAmount: 0,
    rateLimit: 10,
    rateLimitWindow: 60,
    approvedContracts: [0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D],
    blockedFunctions: [
        bytes4(0x3659cfe6),  // upgradeTo
        bytes4(0x4f1ef286),  // upgradeToAndCall
        bytes4(0xf2fde38b)   // transferOwnership
    ],
    requireMultiAiConsensus: true,
    isActive: true,
    reserveFeed: address(0),
    minReserveRatio: 0,
    maxStaleness: 0
});

guardian.registerAgent(agentId, policy);

// Transaction 2: Register metadata in AgentRegistry (public, anyone can call)
registry.registerAgent(agentId, "TradingBot-v1", "Autonomous DeFi rebalancer");
```

**Policy Parameters Reference:**

| Parameter | Type | Description | Example |
|-----------|------|-------------|---------|
| `maxTransactionValue` | uint256 (wei) | Max value per single transaction | `1 ether` |
| `maxDailyVolume` | uint256 (wei) | Max cumulative value per 24h rolling window | `10 ether` |
| `maxMintAmount` | uint256 | Max tokens per mint operation | `1000000e18` |
| `rateLimit` | uint256 | Max actions per window (0 = unlimited) | `10` |
| `rateLimitWindow` | uint256 (seconds) | Rate limit window duration | `60` |
| `approvedContracts` | address[] | Whitelisted targets (empty = all allowed) | `[uniswapRouter]` |
| `blockedFunctions` | bytes4[] | Blacklisted function selectors | `[0x3659cfe6]` |
| `requireMultiAiConsensus` | bool | Require dual-AI approval | `true` |
| `reserveFeed` | address | Chainlink AggregatorV3 PoR feed (0x0 = disabled) | Chainlink feed |
| `minReserveRatio` | uint256 | Min reserve ratio in basis points (10000 = 100%) | `12000` (120%) |
| `maxStaleness` | uint256 (seconds) | Max age of PoR feed data before rejection | `3600` |

### Step 3: Grant CRE Workflow Access

The CRE workflow DON address needs `WORKFLOW_ROLE` to submit verdicts on-chain:

```solidity
guardian.grantRole(keccak256("WORKFLOW_ROLE"), <cre_workflow_don_address>);
```

Without this, every `processVerdict()` call will revert. If you redeploy the CRE workflow, the DON address may change and you'll need to re-grant.

### Step 4: Configure & Deploy the CRE Workflow

**Config (`config/sentinel.config.json`):**

```json
{
  "schedule": "*/5 * * * *",
  "evmChainSelectorName": "ethereum-testnet-sepolia",
  "guardianContractAddress": "0x<your_guardian>",
  "registryContractAddress": "0x<your_registry>",
  "aiEndpoint1": "https://api.anthropic.com/v1/messages",
  "aiEndpoint2": "https://api.openai.com/v1/chat/completions",
  "enableConfidentialCompute": true
}
```

**Deploy:**

```bash
# Simulate locally first
cre workflow simulate sentinel-workflow/main.ts \
  --config config/sentinel.local.config.json

# Deploy to Chainlink CRE network
cre workflow deploy sentinel-workflow/main.ts \
  --config config/sentinel.config.json
```

**Secrets provisioning (for Confidential Compute):**

```bash
# Provision API keys via Chainlink Vault DON
# These are injected as {{TEMPLATE}} variables inside the TEE
# Node operators never see the decrypted keys
cre secrets set ANTHROPIC_API_KEY <your_anthropic_key>
cre secrets set OPENAI_API_KEY <your_openai_key>
```

### Step 5: Integrate Your Agent

Your agent submits proposals via HTTP and gates execution on the verdict.

**Action Proposal Format:**

```json
POST <cre_http_trigger_url>

{
  "agentId": "0x<bytes32_hex>",
  "targetContract": "0x<address>",
  "functionSignature": "0x38ed1739",
  "value": "500000000000000000",
  "mintAmount": "0",
  "calldata": "0x...",
  "description": "Swap 0.5 ETH for USDC on Uniswap",
  "recentValues": [0.5, 0.6, 0.55],
  "recentTimestamps": [1708000000000, 1708000060000, 1708000120000],
  "knownContracts": ["0x7a250d...", "0x68b346..."],
  "commonFunctions": ["0x38ed1739", "0x095ea7b3"]
}
```

| Field | Required | Description |
|-------|----------|-------------|
| `agentId` | Yes | Agent's registered bytes32 ID |
| `targetContract` | Yes | Contract the agent wants to call |
| `functionSignature` | Yes | First 4 bytes of the function selector |
| `value` | Yes | Wei value of the transaction (decimal string) |
| `mintAmount` | Yes | Token amount to mint, "0" if not minting |
| `calldata` | Yes | Full encoded calldata hex |
| `description` | Yes | Human-readable action description |
| `recentValues` | No | Last N transaction values in ETH (for behavioral scoring) |
| `recentTimestamps` | No | Last N action timestamps in ms |
| `knownContracts` | No | Contracts this agent has previously interacted with |
| `commonFunctions` | No | Function selectors this agent commonly uses |

**Verdict Response:**

```json
{
  "status": "success",
  "agentId": "0x...",
  "verdict": "APPROVED",
  "confidence": 92,
  "reason": "Action within policy limits, no anomalies detected",
  "anomalyScore": 10,
  "anomalyFlagged": false,
  "anomalyDimensions": [
    { "name": "Value Deviation", "score": 0, "maxWeight": 25, "fired": false, "reason": "..." },
    { "name": "Sequential Probing", "score": 0, "maxWeight": 35, "fired": false, "reason": "..." }
  ]
}
```

### Step 6: Behavioral Learning Phase

The first 5 approved actions establish the agent's behavioral baseline. After that, the origin is **frozen permanently** — all future actions are compared against this frozen profile.

```
Action 1–5:  Learning phase → baseline accumulating
Action 6+:   Origin frozen → deviations from baseline are flagged
```

**Why this matters:** A compromised agent cannot slowly shift its baseline to enable increasingly large transactions ("boiling frog" attack). The frozen origin catches cumulative drift.

**Recommendation:** Run 5–10 representative safe operations during onboarding to establish a strong baseline before going live.

**The 7 anomaly dimensions:**

| Dimension | Max Score | What It Catches |
|-----------|-----------|-----------------|
| Value Deviation | +25 | Transaction value > 2.5σ from historical mean |
| Contract Diversity | +20 | Interacting with unknown/new contracts |
| Velocity | +15 | Actions faster than 50% of normal interval |
| Function Pattern | +30 | Calling unusual functions for this agent |
| Time-of-Day | +10 | Activity outside the agent's normal hours |
| Sequential Probing | +35 | Monotonically increasing values (binary search for limits) |
| Cumulative Drift | +20 | Rolling average drifted > 3σ from frozen origin |

**Default threshold:** 50. Total possible: 155.

### Step 7: Monitor and Respond

**On-chain events to watch:**

```solidity
// Normal operation
event ActionApproved(bytes32 indexed agentId, address target, uint256 value, uint256 timestamp);

// Incidents
event ActionDenied(bytes32 indexed agentId, address target, uint256 value, string reason, uint256 timestamp);
event CircuitBreakerTriggered(bytes32 indexed agentId, string reason, IncidentType incidentType, uint256 timestamp);

// Agent lifecycle
event AgentFrozen(bytes32 indexed agentId, uint256 timestamp);
event ChallengeCreated(bytes32 indexed agentId, Severity severity, uint64 expiresAt);
event ChallengeResolved(bytes32 indexed agentId, ChallengeStatus result, uint256 timestamp);
```

**View functions for dashboards:**

```solidity
guardian.getAgentState(agentId)       // Active | Frozen | Revoked
guardian.isAgentActive(agentId)       // Quick boolean check
guardian.getAgentPolicy(agentId)      // Full policy parameters
guardian.getActionStats(agentId)      // approved, denied, windowActions, dailyVolume
guardian.getIncident(agentId, index)  // timestamp, type, reason, target, value
guardian.getChallenge(agentId)        // status, expiresAt, severity, reason
```

**Key health metrics:**

| Metric | Healthy | Investigate |
|--------|---------|-------------|
| Approval rate | > 95% | < 80% |
| Incidents per day | 0–2 | > 5 |
| Challenge appeal rate | < 10% | > 30% |
| Frozen agents | 0 | Any |
| Behavioral flag rate | < 5% | > 20% |

**Incident response:**

```solidity
// 1. Agent is already frozen by circuit breaker — investigate
IncidentLog memory incident = guardian.getIncident(agentId, 0);
ActionStats memory stats = guardian.getActionStats(agentId);

// 2. Decide
if (compromised) {
    guardian.revokeAgent(agentId);     // Permanent — cannot be undone
} else {
    guardian.unfreezeAgent(agentId);   // Resume operations
    guardian.updatePolicy(agentId, tighterPolicy);  // Adjust if needed
}
```

---

## Example Configurations by Industry

### DeFi Trading Bot

```solidity
AgentPolicy({
    maxTransactionValue: 5 ether,
    maxDailyVolume: 50 ether,
    maxMintAmount: 0,
    rateLimit: 50,
    rateLimitWindow: 3600,           // 50 trades per hour
    approvedContracts: [uniswapRouter, sushiRouter],
    blockedFunctions: [upgradeTo, transferOwnership],
    requireMultiAiConsensus: true,
    isActive: true,
    reserveFeed: address(0),
    minReserveRatio: 0,
    maxStaleness: 0
})
```

### Stablecoin Minter (with Proof of Reserves)

```solidity
AgentPolicy({
    maxTransactionValue: 0,          // Cannot move ETH
    maxDailyVolume: 0,
    maxMintAmount: 10_000_000e18,    // 10M tokens per operation
    rateLimit: 20,
    rateLimitWindow: 86400,          // 20 per day
    approvedContracts: [stablecoinContract],
    blockedFunctions: [transferOwnership, upgradeTo],
    requireMultiAiConsensus: true,
    isActive: true,
    reserveFeed: 0x8fFfAc...,       // Chainlink PoR feed
    minReserveRatio: 12000,          // 120% collateralized
    maxStaleness: 3600               // Feed must be < 1 hour old
})
```

### Liquidation Bot

```solidity
AgentPolicy({
    maxTransactionValue: 10 ether,
    maxDailyVolume: 100 ether,
    maxMintAmount: 0,
    rateLimit: 5,
    rateLimitWindow: 3600,
    approvedContracts: [lendingProtocol],
    blockedFunctions: [approve, transfer, flashLoan],
    requireMultiAiConsensus: true,
    isActive: true,
    reserveFeed: address(0),
    minReserveRatio: 0,
    maxStaleness: 0
})
```

### Governance Agent (observe-only)

```solidity
AgentPolicy({
    maxTransactionValue: 0,          // Cannot move funds
    maxDailyVolume: 0,
    maxMintAmount: 0,
    rateLimit: 5,
    rateLimitWindow: 86400,          // 5 actions per day max
    approvedContracts: [governanceContract],
    blockedFunctions: [transferOwnership, upgradeTo, transfer],
    requireMultiAiConsensus: true,
    isActive: true,
    reserveFeed: address(0),
    minReserveRatio: 0,
    maxStaleness: 0
})
```

---

## Confidential Compute: Why It Matters

With `enableConfidentialCompute: true`, AI evaluation happens inside a Trusted Execution Environment (TEE):

- **Prompts are encrypted** — Node operators cannot see evaluation criteria
- **API keys stay in the enclave** — Injected via Chainlink Vault DON secret templates
- **Behavioral thresholds are invisible** — Agents cannot reverse-engineer scoring weights
- **Verdicts are attested** — Cryptographic proof the evaluation ran unmodified

**Why this is critical:** Anthropic's research demonstrated AI agents can autonomously discover and exploit vulnerabilities for approximately $1.22 each. If an agent can see its evaluation criteria, it can systematically probe for blind spots. Confidential Compute makes Layers 2 and 3 invisible to the agents being evaluated.

**What remains visible:** Layer 1 on-chain policy parameters (`getAgentPolicy()` is a public view function). This is by design — transparent compliance limits are analogous to published regulatory requirements. Knowing your value cap is 1 ETH doesn't help you bypass behavioral scoring or AI consensus.

---

## Current Limitations

SentinelCRE's current deployment status, verified test coverage, and roadmap for production expansion.

### Verified Components & Test Coverage

| Component | Status | Evidence |
|-----------|--------|----------|
| SentinelGuardian.sol | Deployed, tested | 47 tests, deployed on Tenderly Sepolia fork |
| AgentRegistry.sol | Deployed, tested | 10 tests, deployed on Tenderly Sepolia fork |
| PolicyLib.sol (7 on-chain checks) | Complete | 90 tests across 5 suites, 0 Slither findings |
| CRE workflow (WASM bundle) | Complete | Uses 8 CRE primitives across 3 trigger types, compiles to WASM |
| Behavioral engine (7 dimensions) | Complete | Pure functions, deterministic, runs inside CRE |
| EVMClient reads (policy, agent status) | Working | Reads from deployed contracts via CRE SDK |
| EVMClient writes (processVerdict) | Working | Writes verdicts on-chain via CRE SDK |
| DON consensus aggregation | Integrated | ConsensusAggregationByFields with `identical`/`median` |
| Circuit breaker + challenge/appeal | Working | On-chain state machine with severity-based windows |
| Dashboard (4 tabs + presentation) | Complete | Next.js 15, 29 components, real Tenderly integration |

### Production Deployment Requirements

| Component | Testnet Phase (Current) | Production Deployment |
|-----------|------------------------|----------------------|
| **AI evaluation endpoints** | Deterministic evaluation engine implementing Anthropic + OpenAI API contracts | Connect live Anthropic + OpenAI endpoints via Vault DON secret injection |
| **Behavioral state persistence** | Caller-maintained profiles (by design: WASM workflow is stateless, enabling flexible persistence layer) | Persistent behavioral profile store (Redis, PostgreSQL, or on-chain) maintained by calling infrastructure |
| **HTTP trigger authentication** | Open trigger for testnet demos | Configure `authorizedKeys` in `project.yaml` to restrict proposal submission |
| **Agent identity binding** | Caller-supplied `bytes32` agent ID | On-chain binding between agent wallet address and registered ID, or signed proposals |
| **Heterogeneous AI models** | Workflow fully configured for Claude + GPT-4 with separate request/response handling | Provision real API keys via Vault DON; integration paths fully designed |
| **CRE network deployment** | Verified via CRE CLI simulation | `cre workflow deploy` on a live CRE-supported testnet |
| **Cron health check** | Chain liveness + guardian reachability monitoring | Expand to per-agent rate limit windows, daily volume caps, and stale challenge detection |

### Architecture Design Decisions

1. **Stateless WASM workflow (by design).** The Chainlink CRE runtime compiles workflows to WASM and executes them deterministically on every DON node. This enables BFT consensus but means the calling infrastructure maintains behavioral profiles, passing `recentValues`, `recentTimestamps`, `knownContracts`, and `commonFunctions` with every request. This separation gives integrators flexibility to choose their own persistence layer.

2. **Modular contract architecture.** AgentRegistry and SentinelGuardian are intentionally decoupled — no cross-contract validation. This enables independent deployment, upgradeability, and the option to swap either component. Deployment scripts should register agents in both contracts.

3. **Bounded incident history (100 per agent).** The on-chain circular buffer stores the last 100 incidents per agent in O(1) gas. For full audit trails, subscribe to events (unlimited, indexed on-chain) and archive off-chain.

4. **Gas-optimized reason strings.** The `reason` field from AI verdicts is ABI-encoded on-chain in `processVerdict()`. The workflow truncates to 500 characters to bound gas costs.

5. **Role-gated redeployment.** If the CRE workflow is redeployed, the new DON address needs a fresh `grantRole(WORKFLOW_ROLE)` transaction. This is a deliberate security boundary — no implicit trust between workflow versions.

6. **Native HTTP + ABI integration.** Reference implementations are provided in `agent-simulator/` (4 agent types) and the dashboard's `sentinel-client.ts`. Production TypeScript SDK is on the Phase 2 roadmap.

---

## Roadmap to Production

### Phase 1: Testnet Validation (Current)

- [x] Smart contracts deployed and tested (90 tests, Slither clean)
- [x] CRE workflow compiles and simulates via CRE CLI
- [x] Behavioral engine with 7 anomaly dimensions
- [x] Dashboard with real-time Tenderly integration
- [x] Deterministic AI evaluation service for repeatable demos
- [ ] Record demo video showing full pipeline

### Phase 2: Live CRE Deployment

- [ ] Deploy CRE workflow to live Chainlink DON on a supported testnet
- [ ] Configure `authorizedKeys` for caller authentication
- [ ] Connect real AI endpoints (Anthropic Claude + OpenAI GPT-4)
- [ ] Provision API keys via Vault DON secret templates
- [ ] Verify DON consensus works with real AI model variance
- [ ] Measure end-to-end latency (target: < 5 seconds per verdict)

### Phase 3: Behavioral State Infrastructure

- [ ] Build persistent behavioral profile store (Redis, PostgreSQL, or on-chain)
- [ ] Implement profile service that agents call to get their current context
- [ ] Add origin baseline freezing in the persistent store (not just in-memory)
- [ ] Build profile migration tooling for agent version upgrades

### Phase 4: Identity & Access Control

- [ ] On-chain agent identity binding (wallet address → agentId mapping)
- [ ] Signed proposals (agent signs the proposal, workflow verifies signature)
- [ ] Multi-tenant support (separate policy namespaces per organization)
- [ ] RBAC expansion (per-agent CHALLENGER_ROLE grants)

### Phase 5: Production Hardening

- [ ] Gas optimization audit (minimize on-chain reason string storage)
- [ ] Mainnet deployment with real economic value at stake
- [ ] Formal verification of PolicyLib (already clean on Slither, formal proofs next)
- [ ] Off-chain incident archival (events → indexed database for full history beyond 100-record buffer)
- [ ] Client SDK (TypeScript npm package wrapping proposal submission + profile management)
- [ ] Rate limiting and DDoS protection on CRE trigger endpoint
- [ ] Monitoring and alerting infrastructure (PagerDuty, Slack, Grafana)
- [ ] Policy governance framework (who can change policies, approval workflows, audit logs)

---

## Onboarding Checklist

### Pre-Deployment
- [ ] Contracts compiled and tested (`forge test`)
- [ ] Deployer wallet secured (hardware wallet recommended for mainnet)
- [ ] RPC endpoint available (dedicated node recommended for production)
- [ ] AI API keys provisioned (Anthropic + OpenAI for heterogeneous consensus)

### Deployment
- [ ] Deploy SentinelGuardian + AgentRegistry
- [ ] Grant `WORKFLOW_ROLE` to CRE workflow DON address
- [ ] Deploy CRE workflow (`cre workflow deploy`)
- [ ] Verify config addresses match deployed contracts
- [ ] Configure `authorizedKeys` for trigger authentication

### Per-Agent Setup
- [ ] Define policy parameters (all 12 fields)
- [ ] Register agent in SentinelGuardian (`registerAgent`)
- [ ] Register metadata in AgentRegistry
- [ ] Build behavioral profile maintenance in your agent infrastructure
- [ ] Run 5–10 safe operations (behavioral learning phase)
- [ ] Test with intentional policy violation (should deny + freeze)
- [ ] Test challenge/appeal flow
- [ ] Verify monitoring events are received

### Go-Live
- [ ] Event listeners active for `CircuitBreakerTriggered` and `AgentFrozen`
- [ ] Alerting configured (PagerDuty / Slack for frozen agents)
- [ ] Incident response runbook documented
- [ ] Policy review schedule established (monthly recommended)
- [ ] Behavioral profile backup/restore procedure tested
