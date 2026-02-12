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

### Layer 1: AI Consensus (Off-Chain via CRE)
- Two independent AI models evaluate every action
- Both must return `APPROVED` with structured reasoning
- Temperature 0 ensures deterministic outputs for DON consensus
- Default to DENY on any error or parsing failure (fail-safe)
- CRE's BFT consensus ensures no single DON node can fake a verdict

### Layer 2: On-Chain Policy (Smart Contract)
- `PolicyLib.checkAll()` validates:
  - `checkValue()` — transaction value within limit
  - `checkTarget()` — contract address on whitelist
  - `checkFunction()` — function selector not blocked
  - `checkRateLimit()` — actions within rate window
  - `checkMintAmount()` — mint amount within cap
- Even if AI consensus approves, policy violations trigger circuit breaker
- Smart contract logic is immutable and cannot be bypassed

### Layer 3: Circuit Breaker (Automated Response)
- Freezes agent immediately on violation
- Logs incident immutably (IncidentLog struct)
- Emits events for monitoring (CircuitBreakerTriggered, AgentFrozen)
- Only admin can unfreeze — no automated recovery
- Revocation is permanent (AgentState.Revoked)

### Layer 4: Confidential Compute (Privacy)
- CRE Confidential HTTP hides API keys from DON nodes
- Policy thresholds marked for Confidential Compute boundary
- Prevents AI agents from learning their own constraints
- Production upgrade: wrap policy reads in CC enclave

## Design Principles

1. **Fail-Safe** — Any error defaults to DENY. Guardian never approves on uncertainty.
2. **Defense in Depth** — Two independent layers (AI + policy) must both pass.
3. **Immutable Audit Trail** — All incidents logged on-chain with full context.
4. **Minimal Trust** — CRE's BFT consensus, not single-node evaluation.
5. **Bounded Damage** — Even if bypassed, policy limits cap maximum exposure.
6. **Manual Recovery Only** — Frozen agents require human admin intervention.
