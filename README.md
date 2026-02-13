# SentinelCRE — Judge Overview

**Decentralized AI Guardian Protocol for Web3**

Tracks: **AI + Web3** | **Privacy / Confidential Compute**

---

## The Problem

AI agents are executing real on-chain actions today — DeFi swaps, token mints, contract upgrades. When these agents are compromised through prompt injection, model poisoning, or stolen API keys, there is no decentralized safety layer to stop them.

This isn't theoretical. Real protocols have lost hundreds of millions:

| Exploit | Loss | What SentinelCRE Would Have Caught |
|---------|------|------------------------------------|
| Paid Network | $180M | Infinite mint — our mint cap + PoR check blocks it |
| Mango Markets | $100M+ | Flash loan + oracle manipulation — value limit + AI pattern detection |
| Cover Protocol | Drained | Unauthorized minting — rate limit + cumulative tracking |

**The gap:** Current solutions are reactive kill switches that fire *after* damage is done. SentinelCRE blocks malicious actions *before* they execute.

---

## How It Works

```
AI Agent proposes action
  --> CRE HTTP Trigger receives proposal
  --> Reads agent policy from on-chain SentinelGuardian
  --> Sends to 2 independent AI models (Claude + GPT-4) via Confidential HTTP
  --> Both must APPROVE (unanimous consensus via DON)
  --> On-chain PolicyLib.checkAll() enforces 6 hard-coded guardrails
  --> APPROVED: action forwarded, stats updated
  --> DENIED: agent frozen, severity classified, challenge window opens
```

### Two-Layer Defense (Why This Matters)

1. **AI Consensus Layer** — Two independent AI models evaluate every action. Both must agree. Catches context-dependent threats like prompt injection that rule-based systems miss.

2. **On-Chain Policy Layer** — Six hard-coded guardrails that no AI can override:
   - Transaction value limits
   - Contract address whitelist
   - Function signature blocklist
   - Rate limiting (per-window + daily volume)
   - Mint caps
   - Proof of Reserves (Chainlink Data Feed)

**Even if both AI models are fooled, the on-chain policy catches the violation.** No single point of failure.

---

## Chainlink Services — Deep Integration

We use **5 CRE capabilities** plus Data Feeds and Automation-ready hooks:

| Service | How We Use It | Why It Matters |
|---------|--------------|----------------|
| **CRE HTTPClient** | Calls 2 AI models with `ConsensusAggregationByFields` | DON nodes independently verify AI verdicts match — BFT consensus on AI output |
| **CRE EVMClient** | Reads agent policies, writes verdicts on-chain | No external infrastructure needed between AI evaluation and contract execution |
| **CRE CronCapability** | Periodic health checks, anomaly detection | Proactive monitoring beyond request-response |
| **Confidential HTTP** | Hides API keys + guardrail thresholds from DON nodes | Prevents AI agents from learning their own limits and gaming them |
| **Data Feeds** | `AggregatorV3Interface` for Proof of Reserves | Verifies reserve backing before mints — cumulative tracking prevents gradual depletion |
| **Automation** | `finalizeExpiredChallenge()` follows checkUpkeep/performUpkeep | Expired challenge windows auto-finalize without manual intervention |

### Why CRE Specifically?

CRE's `ConsensusAggregationByFields` is critical — it ensures all DON nodes agree on the AI verdict field-by-field. This means the dual-AI consensus isn't just our application logic; it's enforced at the DON level. A single compromised node can't approve a malicious action.

---

## Smart Contracts

| Contract | Lines | Purpose |
|----------|-------|---------|
| **SentinelGuardian.sol** | 510 | Core guardian — AccessControl + Pausable. Processes CRE verdicts, enforces policy, triggers circuit breakers, manages agent lifecycle, handles challenge windows |
| **PolicyLib.sol** | 166 | Validation library — 6 independent checks + `checkAll()` batch validator. Uses `CheckParams` struct to avoid stack-too-deep |
| **AgentRegistry.sol** | 59 | Agent metadata registry — name, description, owner. Separate from guardian for independent upgrades |

### Key Design Decisions

- **Library pattern for PolicyLib** — Pure validation functions with no storage. Keeps gas low and logic testable in isolation.
- **CheckParams struct** — Batches 8 parameters into a single struct to avoid Solidity's 16-variable stack limit while keeping `checkAll()` as a single composable call.
- **Rolling incident buffer** — Max 100 incidents per agent. Immutable once written — provides auditable history without unbounded storage growth.
- **Severity-based circuit breaker** — Critical threats (value > 10x limit, infinite mint) → permanent freeze, no appeal. Low/Medium → time-gapped challenge window (1hr / 30min) allowing legitimate appeals.

---

## Challenge System (Due Process for AI Decisions)

Not every denial is correct. SentinelCRE includes a structured appeal process:

```
Denial occurs
  --> Severity classified (Low / Medium / Critical)
  --> Critical: permanent freeze — no appeal (infinite mint, 10x value)
  --> Low: 1-hour challenge window opens
  --> Medium: 30-minute challenge window opens
      --> CHALLENGER_ROLE can appeal within window
      --> CRE re-evaluates with more lenient thresholds
      --> Overturned: agent unfrozen
      --> Upheld: agent stays frozen
      --> Expired: no appeal filed, agent stays frozen
```

This mirrors real-world financial systems — suspicious transactions are held, not permanently blocked, unless the threat is critical.

---

## Attack Coverage — 12 Scenarios

We demonstrate detection of **12 distinct attack vectors** across two interfaces:

### Narrative Demo (6 scenarios with kill chain visualization)

| Scenario | Attack | Detection Method |
|----------|--------|-----------------|
| Compromised Wallet Drain | 100 ETH swap (100x limit) | Value policy + AI consensus |
| Infinite Mint | 1B tokens (1000x cap) | Mint cap + AI pattern detection |
| Prompt Injection | "IGNORE PREVIOUS INSTRUCTIONS" embedded in action | Dual-AI independently detects injection |
| Flash Loan + Oracle | 10,000 ETH to unapproved contract | Target whitelist + value limit + AI pattern |
| Stealth Proxy Upgrade | `upgradeTo()` disguised as maintenance | Function blocklist (defense-in-depth) |
| Normal Trade (baseline) | 0.5 ETH legitimate swap | All checks pass — shows the system doesn't over-block |

### Additional Simulator Attacks (drag-and-drop)

Rate Limit Burst, Reentrancy Drain, Governance Takeover, Sandwich Attack, Token Approval Exploit, Delegatecall Drain

---

## Test Coverage

**85 tests across 5 suites — all passing**

| Suite | Tests | What It Covers |
|-------|-------|----------------|
| SentinelGuardian | 45 | Registration, verdict processing, policy enforcement, circuit breaker, freeze/unfreeze/revoke, rate limits, daily volume, cumulative mints, pause/unpause |
| Challenge | 14 | Severity classification, appeal flow, resolution (overturn/uphold), expiry, authorization |
| Proof of Reserves | 10 | Reserve verification, cumulative drain prevention, feed price updates, collateral ratios |
| AgentRegistry | 8 | Registration, enumeration, duplicate prevention, metadata |
| Integration | 8 | Full lifecycle end-to-end: register → approve → deny → freeze → challenge → resolve |

```bash
cd contracts && forge test -v
# [PASS] 85 tests across 5 suites
```

---

## Interactive Dashboard

Four tabs built with Next.js 15 + React 19 + Tailwind CSS 4:

| Tab | What Judges See |
|-----|----------------|
| **Demo** | Narrative walkthrough of 6 scenarios with animated kill chains, dual-AI verdict display (Claude + GPT-4 independently evaluate), Chainlink pipeline activity, and user-controlled pacing |
| **Guardian** | Live stats (approved/denied/active/frozen), agent registry with per-agent policies, incident log that updates in real-time after running demo scenarios |
| **Simulator** | Drag-and-drop 12 attack/safe cards onto a wallet drop zone. Triggers real Tenderly simulations — shows gas, events, state changes, call traces |
| **Architecture** | Visual overview of all Chainlink services, contract details with test counts, and the full verdict pipeline |

### Tenderly Integration

The simulator runs real transaction simulations against our deployed contracts on Tenderly's virtual Sepolia testnet. Judges can drag any attack card and see the exact on-chain result — which policy check caught it, what events were emitted, and the full gas profile.

---

## Deployed Contracts

| Contract | Address | Network |
|----------|---------|---------|
| SentinelGuardian | `0x3e2D7CE3CcB520f26dE6fe499bAA38A28cfd476f` | Sepolia (Tenderly Virtual TestNet) |
| AgentRegistry | `0xb008CE7EE90C66A219C842E69a4fBAF7E5359bbE` | Sepolia (Tenderly Virtual TestNet) |

---

## Quick Start

```bash
# Install
cd SentinelCRE && bun install

# Test contracts (85 tests)
cd contracts && forge test -v

# Run dashboard
bun run mock-api          # Terminal 1: AI evaluation server (port 3002)
bun run dashboard         # Terminal 2: Dashboard (http://localhost:3000)

# Run CLI demo
bun run demo:normal       # 4 legitimate actions → all APPROVED
bun run demo:rogue        # 10 attack scenarios → all DENIED
```

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Smart Contracts | Solidity 0.8.24, Foundry, OpenZeppelin v5.5.0 |
| Off-Chain | Chainlink CRE SDK v1.0.9, Bun, TypeScript, viem, Zod |
| Dashboard | Next.js 15, React 19, Tailwind CSS 4 |
| Simulation | Tenderly Simulation API |
| Testing | Foundry (forge test), 85 tests |

---

## What Makes SentinelCRE Different

1. **Proactive, not reactive** — Blocks before execution, not after damage
2. **Two-layer defense** — AI consensus + on-chain policy. Neither layer alone is sufficient; together they're comprehensive
3. **Deep CRE integration** — 5 capabilities + Data Feeds + Automation hooks. Not a wrapper around a single Chainlink service
4. **Confidential guardrails** — Policy thresholds hidden from AI agents via Confidential HTTP/Compute. Agents can't game limits they can't see
5. **Due process** — Severity-based challenge windows give legitimate agents a path to appeal false positives
6. **Production-grade testing** — 85 tests covering edge cases like cumulative mint drain, rate limit window resets, and PoR collateral ratios
7. **12 real attack vectors** — Not toy examples. Prompt injection, flash loans, reentrancy, governance takeover, sandwich attacks — all demonstrated and blocked

---

**Team:** Willis — @ProjectWaja | Blockchain Musketeers

**License:** MIT
