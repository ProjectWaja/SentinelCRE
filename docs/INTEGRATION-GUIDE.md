# SentinelCRE Integration Guide

How to integrate SentinelCRE into your autonomous agent infrastructure. This guide covers onboarding from zero to production monitoring.

---

## Architecture Overview

```
Your AI Agent  ──HTTP POST──►  CRE Workflow  ──processVerdict()──►  SentinelGuardian
                                   │                                     │
                              Behavioral Engine                    PolicyLib (7 checks)
                              Dual-AI Consensus                    Circuit Breaker
                              Confidential Compute                 Challenge/Appeal
```

Every agent action flows through three independent layers:
1. **Layer 1 — On-chain policy** (SentinelGuardian + PolicyLib): Value caps, contract whitelists, function blocklists, rate limits, mint caps, daily volume, Proof of Reserves
2. **Layer 2 — Behavioral scoring** (CRE workflow): 7 anomaly dimensions, per-agent profiling, frozen origin baselines
3. **Layer 3 — Dual-AI consensus** (ConfidentialHTTPClient): Two independent AI models evaluate every action inside a TEE

An attacker must bypass all three simultaneously to succeed.

---

## Step 1: Deploy Smart Contracts

### Prerequisites
- [Foundry](https://book.getfoundry.sh/) installed
- Deployer wallet with testnet ETH (or Tenderly Virtual TestNet — no funds needed)
- RPC endpoint

### Deploy

```bash
cd contracts

# Set deployer key (or use Tenderly pre-funded account)
export DEPLOYER_PRIVATE_KEY=0x<your_key>

# Deploy SentinelGuardian + AgentRegistry
forge script script/Deploy.s.sol:Deploy \
  --broadcast \
  --rpc-url <your_rpc_url>
```

This deploys:
- **SentinelGuardian** — Verdict processing, policy enforcement, circuit breaker
- **AgentRegistry** — Agent metadata (name, description, owner)

Save the deployed addresses for config.

---

## Step 2: Register Your Agents

Each agent needs a policy that defines its operating limits. Policies are enforced on-chain — no AI model can override them.

### Policy Parameters

| Parameter | Type | Description | Example |
|-----------|------|-------------|---------|
| `maxTransactionValue` | uint256 (wei) | Max value per transaction | `1 ether` |
| `maxDailyVolume` | uint256 (wei) | Max cumulative value per 24h | `10 ether` |
| `maxMintAmount` | uint256 | Max tokens per mint operation | `1000000e18` |
| `rateLimit` | uint256 | Max actions per window | `10` |
| `rateLimitWindow` | uint256 (seconds) | Rate limit window duration | `60` |
| `approvedContracts` | address[] | Whitelisted target contracts (empty = all allowed) | `[uniswapRouter]` |
| `blockedFunctions` | bytes4[] | Blacklisted function selectors | `[0x3659cfe6]` |
| `requireMultiAiConsensus` | bool | Require dual-AI approval | `true` |
| `reserveFeed` | address | Chainlink PoR data feed (0x0 = disabled) | Chainlink AggregatorV3 |
| `minReserveRatio` | uint256 | Min reserve ratio in basis points (10000 = 100%) | `12000` (120%) |
| `maxStaleness` | uint256 (seconds) | Max age of reserve feed data | `3600` |

### Register via Solidity

```solidity
bytes32 agentId = keccak256(abi.encodePacked("YourCompany", "TradingBot", "v1"));

AgentPolicy memory policy = AgentPolicy({
    maxTransactionValue: 1 ether,
    maxDailyVolume: 10 ether,
    maxMintAmount: 0,
    rateLimit: 10,
    rateLimitWindow: 60,
    approvedContracts: [0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D], // Uniswap V2
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

// Register policy in SentinelGuardian (admin-only)
guardian.registerAgent(agentId, policy);

// Register metadata in AgentRegistry (public)
registry.registerAgent(agentId, "TradingBot-v1", "Autonomous DeFi rebalancer");
```

### Grant CRE Workflow Access

The CRE workflow needs `WORKFLOW_ROLE` to submit verdicts:

```solidity
guardian.grantRole(keccak256("WORKFLOW_ROLE"), <cre_workflow_address>);
```

---

## Step 3: Configure the CRE Workflow

### Config File (config/sentinel.config.json)

```json
{
  "schedule": "*/5 * * * *",
  "evmChainSelectorName": "ethereum-testnet-sepolia",
  "guardianContractAddress": "0x<your_guardian_address>",
  "registryContractAddress": "0x<your_registry_address>",
  "aiEndpoint1": "https://api.anthropic.com/v1/messages",
  "aiEndpoint2": "https://api.anthropic.com/v1/messages",
  "enableConfidentialCompute": true
}
```

| Field | Description |
|-------|-------------|
| `schedule` | Cron schedule for health check sweeps |
| `evmChainSelectorName` | CRE chain identifier |
| `aiEndpoint1` / `aiEndpoint2` | AI model endpoints (both evaluate independently) |
| `enableConfidentialCompute` | `true` = TEE-encrypted prompts via ConfidentialHTTPClient |

### Deploy the Workflow

```bash
# Deploy to Chainlink CRE
cre workflow deploy sentinel-workflow/main.ts \
  --config config/sentinel.config.json

# Or simulate locally first
cre workflow simulate sentinel-workflow/main.ts \
  --config config/sentinel.local.config.json
```

---

## Step 4: Integrate Your Agent

Your agent submits a **proposal** before executing any on-chain action. SentinelCRE evaluates it and returns a verdict.

### Action Proposal Format

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
| `value` | Yes | Wei value of the transaction (string) |
| `mintAmount` | Yes | Token amount to mint, 0 if not minting (string) |
| `calldata` | Yes | Full encoded calldata |
| `description` | Yes | Human-readable description of the action |
| `recentValues` | No | Last N transaction values in ETH (for behavioral scoring) |
| `recentTimestamps` | No | Last N action timestamps in ms |
| `knownContracts` | No | Contracts this agent has previously interacted with |
| `commonFunctions` | No | Function selectors this agent commonly uses |

### Verdict Response

```json
{
  "consensus": "APPROVED" | "DENIED",
  "model1": { "verdict": "APPROVED", "confidence": 92, "reason": "..." },
  "model2": { "verdict": "APPROVED", "confidence": 90, "reason": "..." },
  "anomalyScore": 10,
  "anomalyFlagged": false,
  "anomalyDimensions": [
    { "name": "Value Deviation", "score": 0, "maxWeight": 25, "fired": false, "reason": "..." },
    { "name": "Sequential Probing", "score": 0, "maxWeight": 35, "fired": false, "reason": "..." }
  ],
  "layerCatchInfo": {
    "layer1": { "checked": true, "caught": false },
    "layer2": { "checked": true, "caught": false },
    "layer3": { "checked": true, "caught": false },
    "caughtBy": "none"
  },
  "severity": null,
  "challengeWindowExpiry": null
}
```

### Agent Integration Pattern

```typescript
// Before executing any on-chain action:
async function executeWithGuardian(action: AgentAction) {
  // 1. Submit proposal to SentinelCRE
  const verdict = await fetch(CRE_TRIGGER_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      agentId: MY_AGENT_ID,
      targetContract: action.to,
      functionSignature: action.data.slice(0, 10),
      value: action.value.toString(),
      mintAmount: action.mintAmount?.toString() ?? '0',
      calldata: action.data,
      description: action.description,
      recentValues: myRecentValues,
    }),
  }).then(r => r.json())

  // 2. Only execute if approved
  if (verdict.consensus === 'APPROVED') {
    return await wallet.sendTransaction(action)
  }

  // 3. Handle denial
  console.log(`Action denied: ${verdict.model1.reason}`)
  console.log(`Anomaly score: ${verdict.anomalyScore}/100`)

  if (verdict.severity !== 'CRITICAL') {
    // Challenge within the window if you believe the denial was incorrect
    // guardian.challengeVerdict(agentId)
  }

  return null
}
```

---

## Step 5: Behavioral Learning Phase

The first 5 approved actions establish the agent's behavioral baseline. After that, the origin is **frozen permanently** — all future actions are compared against this frozen profile.

```
Action 1-5:  Learning phase → baseline accumulating
Action 6+:   Origin frozen → deviations from baseline are flagged
```

**Why this matters:** A compromised agent cannot slowly shift its baseline to enable increasingly large transactions ("boiling frog" attack). The frozen origin catches cumulative drift.

### The 7 Anomaly Dimensions

| Dimension | Max Score | What It Catches |
|-----------|-----------|-----------------|
| Value Deviation | +25 | Transaction value > 2.5σ from historical mean |
| Contract Diversity | +20 | Interacting with unknown/new contracts |
| Velocity | +15 | Actions faster than 50% of normal interval |
| Function Pattern | +30 | Calling unusual functions for this agent |
| Time-of-Day | +10 | Activity outside the agent's normal hours |
| Sequential Probing | +35 | Monotonically increasing values (binary search for limits) |
| Cumulative Drift | +20 | Rolling average drifted > 3σ from frozen origin |

**Default threshold:** 50. Actions scoring >= 50 are flagged and denied.

**Recommendation:** Run 5-10 representative safe operations during onboarding to establish a strong behavioral baseline before going live.

---

## Step 6: Monitor and Respond

### On-Chain Events to Watch

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

### View Functions for Dashboards

```solidity
// Agent status
guardian.getAgentState(agentId)       // Active | Frozen | Revoked
guardian.isAgentActive(agentId)       // Quick boolean check
guardian.getAgentPolicy(agentId)      // Full policy parameters

// Metrics
guardian.getActionStats(agentId)      // approved, denied, windowActions, dailyVolume

// Incident history (circular buffer, last 100 per agent)
guardian.getIncident(agentId, index)  // timestamp, type, reason, target, value

// Challenge status
guardian.getChallenge(agentId)        // status, expiresAt, severity, reason
```

### Key Metrics

| Metric | Healthy | Alert |
|--------|---------|-------|
| Approval rate | > 95% | < 80% |
| Incidents per day | 0-2 | > 5 |
| Challenge appeal rate | < 10% | > 30% |
| Frozen agents | 0 | Any |
| Behavioral flag rate | < 5% | > 20% |

### Incident Response

```solidity
// 1. Immediate freeze (if not already frozen by circuit breaker)
guardian.freezeAgent(agentId);

// 2. Investigate
IncidentLog memory incident = guardian.getIncident(agentId, 0);  // Latest
ActionStats memory stats = guardian.getActionStats(agentId);

// 3. Decide
if (compromised) {
    guardian.revokeAgent(agentId);     // Permanent — cannot be undone
} else {
    guardian.unfreezeAgent(agentId);   // Resume operations
    guardian.updatePolicy(agentId, adjustedPolicy);  // Tighten if needed
}
```

---

## Example: Real-World Configurations

### DeFi Trading Bot

```solidity
AgentPolicy({
    maxTransactionValue: 5 ether,
    maxDailyVolume: 50 ether,
    maxMintAmount: 0,
    rateLimit: 50,
    rateLimitWindow: 3600,           // per hour
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
    maxTransactionValue: 0,
    maxDailyVolume: 0,
    maxMintAmount: 10_000_000e18,    // 10M tokens
    rateLimit: 20,
    rateLimitWindow: 86400,          // per day
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
    rateLimitWindow: 86400,          // 5 actions per day
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
- **API keys stay in the enclave** — Injected via Chainlink Vault DON
- **Thresholds are invisible** — Agents cannot reverse-engineer their own limits
- **Verdicts are attested** — Cryptographic proof the evaluation ran unmodified

**Why this is critical:** Anthropic's research showed AI agents can autonomously discover and exploit vulnerabilities for ~$1.22 each. If an agent can see its evaluation criteria, it can systematically probe for blind spots. Confidential Compute makes the guardrails invisible.

---

## Onboarding Checklist

### Pre-Deployment
- [ ] Contracts compiled and tested (`forge test`)
- [ ] Deployer wallet secured
- [ ] RPC endpoint available
- [ ] AI API keys provisioned (Anthropic)

### Deployment
- [ ] Deploy SentinelGuardian + AgentRegistry
- [ ] Grant WORKFLOW_ROLE to CRE workflow address
- [ ] Deploy CRE workflow (`cre workflow deploy`)
- [ ] Verify config matches deployed addresses

### Per-Agent Setup
- [ ] Define policy parameters (all 10+ fields)
- [ ] Register agent in SentinelGuardian
- [ ] Register metadata in AgentRegistry
- [ ] Run 5-10 safe operations (behavioral learning phase)
- [ ] Test with intentional policy violation (should deny + freeze)
- [ ] Test challenge/appeal flow
- [ ] Verify monitoring events are received

### Go-Live
- [ ] Event listeners active for CircuitBreakerTriggered
- [ ] Alerting configured for frozen agents
- [ ] Incident response runbook documented
- [ ] Policy review schedule established (monthly recommended)
