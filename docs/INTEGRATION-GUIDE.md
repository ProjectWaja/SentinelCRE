# SentinelCRE Integration Guide

How SentinelCRE protects autonomous AI agents — architecture, defense layers, and deployment model.

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
│  POST proposal to CRE Workflow HTTP trigger                         │
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

## Integration Patterns

SentinelCRE supports multiple integration models depending on your agent architecture and throughput requirements.

### Pre-Execution Gate (Most Common)

The agent submits every proposed action to SentinelCRE before execution. This is a synchronous call — the agent blocks until a verdict is returned. The verdict includes the consensus decision, anomaly score, and individual AI model assessments.

### Batch Evaluation (High-Throughput Agents)

For agents that generate many actions per minute, proposals can be evaluated in parallel batches. Approved actions execute; denied actions trigger alerts and optional challenge flows.

### Multi-Agent Fleet Management

Organizations running multiple agents register each with tailored policies — a trading bot gets different limits than a minting agent or governance watcher. Each policy is independently configurable across all 12 on-chain parameters plus behavioral thresholds.

### Event-Driven Monitoring

Subscribe to SentinelGuardian on-chain events (`ActionDenied`, `CircuitBreakerTriggered`, `AgentFrozen`) for real-time monitoring dashboards, PagerDuty alerts, and Slack notifications. The contract emits indexed events for every verdict, state change, and challenge action.

---

## What Makes This Different

### Behavioral Anomaly Detection

Most guardrail systems check static rules. SentinelCRE goes further with a 7-dimension behavioral scoring engine that detects:

- **Value deviation** — Transactions significantly outside historical norms
- **Contract diversity** — Sudden interaction with unknown contracts
- **Velocity anomalies** — Unusual burst patterns
- **Function pattern shifts** — Calling functions outside the agent's normal repertoire
- **Time-of-day deviation** — Activity outside established operational hours
- **Sequential probing** — Monotonically increasing values that indicate limit-testing
- **Cumulative drift** — Gradual baseline shift ("boiling frog" attack)

The behavioral baseline freezes after an initial learning phase, preventing an attacker from slowly poisoning the profile.

### Dual-AI Consensus

Two independent AI models (Claude + GPT-4) evaluate every action with full context — the agent's behavioral history, policy parameters, portfolio data, and transaction patterns. Both must approve. A single compromised or hallucinating model cannot greenlight a malicious action.

### Confidential Compute

With `enableConfidentialCompute: true`, the entire evaluation pipeline runs inside a Trusted Execution Environment (TEE):

- **Prompts are encrypted** — Node operators cannot see evaluation criteria
- **API keys stay in the enclave** — Injected via Chainlink Vault DON secret templates
- **Behavioral thresholds are invisible** — Agents cannot reverse-engineer scoring weights
- **Verdicts are attested** — Cryptographic proof the evaluation ran unmodified

**Why this is critical:** Anthropic's research demonstrated AI agents can autonomously discover and exploit vulnerabilities for approximately $1.22 each. If an agent can see its evaluation criteria, it can systematically probe for blind spots. Confidential Compute makes Layers 2 and 3 invisible to the agents being evaluated.

**What remains visible:** Layer 1 on-chain policy parameters (`getAgentPolicy()` is a public view function). This is by design — transparent compliance limits are analogous to published regulatory requirements. Knowing your value cap is 1 ETH doesn't help you bypass behavioral scoring or AI consensus.

### On-Chain Circuit Breaker

When the anomaly score exceeds the threshold or AI models deny an action, the contract's circuit breaker automatically freezes the agent. Severity-based challenge windows (Low = 1hr, Medium = 30min, High = 10min, Critical = no challenge) enable legitimate agents to appeal false positives while ensuring compromised agents are locked down immediately.

---

## Verified Components & Test Coverage

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

---

## Production Deployment Model

| Component | Testnet Phase (Current) | Production Deployment |
|-----------|------------------------|----------------------|
| **AI evaluation endpoints** | Deterministic evaluation engine implementing Anthropic + OpenAI API contracts | Connect live Anthropic + OpenAI endpoints via Vault DON secret injection |
| **Behavioral state persistence** | Caller-maintained profiles (stateless WASM by design) | Persistent behavioral profile store (Redis, PostgreSQL, or on-chain) |
| **HTTP trigger authentication** | Open trigger for testnet demos | Configure `authorizedKeys` in `project.yaml` |
| **Agent identity binding** | Caller-supplied `bytes32` agent ID | On-chain binding between agent wallet address and registered ID |
| **CRE network deployment** | Verified via CRE CLI simulation | `cre workflow deploy` on a live CRE-supported testnet |

---

## Architecture Design Decisions

1. **Stateless WASM workflow (by design).** The Chainlink CRE runtime compiles workflows to WASM and executes them deterministically on every DON node. This enables BFT consensus but means the calling infrastructure maintains behavioral profiles. This separation gives integrators flexibility to choose their own persistence layer.

2. **Modular contract architecture.** AgentRegistry and SentinelGuardian are intentionally decoupled — no cross-contract validation. This enables independent deployment, upgradeability, and the option to swap either component.

3. **Bounded incident history (100 per agent).** The on-chain circular buffer stores the last 100 incidents per agent in O(1) gas. For full audit trails, subscribe to events and archive off-chain.

4. **Gas-optimized reason strings.** The workflow truncates verdict reasons to 500 characters to bound gas costs while preserving diagnostic value.

5. **Role-gated redeployment.** If the CRE workflow is redeployed, the new DON address needs a fresh `grantRole(WORKFLOW_ROLE)` transaction. Deliberate security boundary — no implicit trust between workflow versions.

---

## Roadmap

### Phase 1: Testnet Validation (Current)

- [x] Smart contracts deployed and tested (90 tests, Slither clean)
- [x] CRE workflow compiles and simulates via CRE CLI
- [x] Behavioral engine with 7 anomaly dimensions
- [x] Dashboard with real-time Tenderly integration
- [x] Deterministic AI evaluation service for repeatable demos

### Phase 2: Live CRE Deployment

- [ ] Deploy CRE workflow to live Chainlink DON
- [ ] Connect real AI endpoints (Anthropic Claude + OpenAI GPT-4)
- [ ] Provision API keys via Vault DON secret templates
- [ ] Verify DON consensus with real AI model variance
- [ ] Measure end-to-end latency (target: < 5 seconds per verdict)

### Phase 3: Production Hardening

- [ ] Persistent behavioral profile infrastructure
- [ ] On-chain agent identity binding with signed proposals
- [ ] Multi-tenant support with per-organization policy namespaces
- [ ] Client SDK (TypeScript npm package)
- [ ] Mainnet deployment with real economic value at stake

---

## Get Started

SentinelCRE is built for production integration. If you're running autonomous AI agents on-chain and want to explore how SentinelCRE fits your architecture, we'd love to talk.

**What we provide:**
- Deployment and configuration assistance
- Custom policy design for your specific agent fleet
- Behavioral threshold tuning for your operational patterns
- Ongoing monitoring and incident response support

See [ARCHITECTURE.md](ARCHITECTURE.md) for deeper technical details, [CRE_INTEGRATION.md](CRE_INTEGRATION.md) for Chainlink CRE specifics, and [CONFIDENTIAL-COMPUTE.md](CONFIDENTIAL-COMPUTE.md) for the privacy model.
