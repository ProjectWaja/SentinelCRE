# SentinelCRE — Security Model

## Threat Model

### Threats Addressed

| Threat | Vector | SentinelCRE Defense |
|--------|--------|-------------------|
| Prompt injection | Attacker manipulates AI agent's prompt to execute unauthorized actions | Multi-AI consensus — both models must agree; policy enforcement as second layer |
| Model poisoning | Compromised model weights produce malicious outputs | Two independent models reduce single-point-of-failure; on-chain policy cannot be bypassed by AI |
| Stolen credentials | Attacker obtains agent's signing keys | Policy limits cap damage; rate limiting prevents rapid drain; circuit breaker freezes agent |
| Infinite mint | Attacker mints unbounded tokens to crash price or drain liquidity | `maxMintAmount` policy field caps mint per transaction |
| Flash loan manipulation | Agent proposes actions based on manipulated oracle prices | Value limits and daily volume caps bound maximum exposure |
| Rapid drain | Attacker uses agent to execute many small transactions quickly | Rate limiting (actions per window) + daily volume tracking |
| Unauthorized targets | Agent calls contracts outside its intended scope | `approvedContracts[]` whitelist — only pre-approved addresses |
| Destructive functions | Agent calls selfdestruct, proxy upgrades, or admin functions | `blockedFunctions[]` blacklist — function signatures are explicitly blocked |

### Threats NOT Addressed (Out of Scope)

- Private key theft of the guardian admin
- Vulnerabilities in target contracts themselves
- Network-level attacks (MEV, front-running)
- Social engineering of human admin

## Defense Layers

### Layer 1: On-Chain Policy (Deterministic — Smart Contract)
- `PolicyLib.checkAll()` runs inside `SentinelGuardian.processVerdict()`:
  - `checkValue()` — transaction value within limit
  - `checkTarget()` — contract address on whitelist
  - `checkFunction()` — function selector not blocked
  - `checkRateLimit()` — actions within rate window
  - `checkMintAmount()` — mint amount within cap
  - `checkDailyVolume()` — cumulative value within 24h cap
  - `checkReserves()` — Proof of Reserves via Chainlink Data Feeds
- Even if AI consensus approves, policy violations trigger circuit breaker
- Smart contract logic is immutable and cannot be bypassed by AI

### Layer 2: Behavioral Risk Scoring (Statistical — Off-Chain)
- 7-dimension anomaly detection engine runs inside CRE workflow
- Each agent builds a behavioral baseline from its first 5 approved actions
- Baseline is **frozen permanently** — prevents slow drift poisoning
- Detects: value deviation, unknown contracts, velocity bursts, unusual functions, off-hours activity, sequential probing, and cumulative drift
- Risk threshold: score >= 50 triggers denial
- Key insight: sequential probing detection (+35 weight) directly counters binary search attacks against invisible thresholds

### Layer 3: Multi-AI Consensus (Contextual — Off-Chain via CRE)
- Two independent AI models evaluate every action with behavioral context injected
- Both must return `APPROVED` with structured reasoning
- Temperature 0 ensures deterministic outputs for DON consensus
- Default to DENY on any error or parsing failure (fail-safe)
- CRE's BFT consensus ensures no single DON node can fake a verdict

### Circuit Breaker (Automated Response)
- Freezes agent immediately on any layer's violation
- Logs incident immutably (IncidentLog struct, rolling buffer max 100)
- Classifies severity: Critical (permanent freeze), Medium (30-min appeal), Low (1-hour appeal)
- Emits events for monitoring (CircuitBreakerTriggered, AgentFrozen)
- Only admin can unfreeze — no automated recovery
- Revocation is permanent (AgentState.Revoked)

### Confidential Compute (Cross-Cutting Privacy)
- CRE `ConfidentialHTTPClient` hides API keys, evaluation prompts, and AI responses inside TEE
- Policy thresholds embedded in evaluation prompts are invisible to agents and node operators
- Prevents AI agents from learning their own constraints or reverse-engineering guardrail boundaries
- API keys injected via Vault DON `{{TEMPLATE}}` syntax — never exposed outside enclave

## Design Principles

1. **Fail-Safe** — Any error defaults to DENY. Guardian never approves on uncertainty.
2. **Defense in Depth** — Three independent layers (policy + behavioral + AI) must all pass. No single point of failure.
3. **Immutable Audit Trail** — All incidents logged on-chain with full context.
4. **Minimal Trust** — CRE's BFT consensus, not single-node evaluation.
5. **Bounded Damage** — Even if bypassed, policy limits cap maximum exposure.
6. **Manual Recovery Only** — Frozen agents require human admin intervention.
7. **Frozen Baselines** — Behavioral origin freezes after 5 actions, preventing slow drift poisoning.
