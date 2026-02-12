# SentinelCRE — Demo Video Script (5 minutes)

## 0:00 – 0:30 | Opening — The Problem

**Visual:** Title card: "SentinelCRE — Decentralized AI Guardian for Web3"

**Narration:**
> "AI agents are executing real on-chain actions — trading, minting, transferring tokens. But when these agents get compromised, there's no infrastructure to stop them. Paid Network lost $180 million to an infinite mint attack. SentinelCRE is a decentralized sentinel guardian that prevents bad actors from exploiting AI agents on-chain."

## 0:30 – 1:30 | Architecture Overview

**Visual:** Architecture diagram (docs/architecture.mermaid rendered)

**Narration:**
> "SentinelCRE uses Chainlink CRE as its orchestration backbone. When an AI agent proposes an action, it goes through our CRE workflow — not directly to the blockchain.
>
> The workflow does three things:
> 1. Reads the agent's policy from our on-chain SentinelGuardian contract
> 2. Runs multi-AI consensus — two independent AI models must BOTH approve the action
> 3. Writes the verdict on-chain, where the smart contract runs a second layer of policy enforcement
>
> If either layer denies the action, the circuit breaker fires — the agent is frozen, and the incident is logged immutably."

## 1:30 – 3:00 | Live Demo

### Normal Agent (1:30 – 2:00)

**Visual:** Terminal running `bun run demo:normal`

**Narration:**
> "First, let's see normal operation. Our trading agent sends legitimate trades — small ETH swaps on an approved DEX. Both AI models approve, consensus passes, actions go through."

### Rogue Agent (2:00 – 3:00)

**Visual:** Terminal running `bun run demo:rogue`

**Narration:**
> "Now the agent gets compromised. Five attack scenarios:
>
> **Attack 1:** Massive 100 ETH swap — instantly denied. Both models flag the value.
>
> **Attack 2:** Call to an unapproved contract — denied. Not on the whitelist.
>
> **Attack 3:** Blocked function signature — denied. Destructive functions are blacklisted.
>
> **Attack 4:** 20 rapid-fire transactions — the AI layer lets some through, but the on-chain rate limit catches them. This shows why two layers matter.
>
> **Attack 5:** The big one — an infinite mint attack. One billion stablecoins. The AI models catch it instantly with 99% confidence. Circuit breaker fires. Agent frozen. Not a single token minted."

## 3:00 – 4:00 | On-Chain Verification

**Visual:** Tenderly Virtual TestNet explorer showing transactions

**Narration:**
> "On Tenderly, you can see the full audit trail. Approved actions with their parameters, denied actions with the circuit breaker events, and the frozen agent state — all on-chain, all immutable.
>
> 61 Foundry tests verify every path — policy enforcement, circuit breaker logic, rate limiting, the infinite mint guard, and full lifecycle integration tests."

## 4:00 – 4:30 | Confidential Compute

**Visual:** Code showing `[CONFIDENTIAL_COMPUTE_BOUNDARY]` markers

**Narration:**
> "One more thing — we use CRE's Confidential HTTP to hide API keys and guardrail thresholds from DON nodes. And we've marked where Chainlink's upcoming Confidential Compute SDK will hide policy parameters from the AI agents themselves, preventing them from learning and gaming their own constraints."

## 4:30 – 5:00 | Closing

**Visual:** Summary slide with Chainlink services used

**Narration:**
> "SentinelCRE uses five Chainlink services: CRE workflows, HTTPClient for multi-AI consensus, EVMClient for on-chain policy, CronCapability for health checks, and Confidential HTTP for privacy.
>
> As AI agents become the primary interface to DeFi, security infrastructure like SentinelCRE becomes critical. The sentinel guardian watches, so you don't have to."

**Visual:** GitHub repo URL + team info
