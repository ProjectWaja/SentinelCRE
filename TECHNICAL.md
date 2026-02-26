# SentinelCRE

**Decentralized AI Guardian Protocol for Web3**

SentinelCRE is an infrastructure-level sentinel guardian that sits between AI agents and on-chain execution, using Chainlink CRE for multi-AI consensus, policy enforcement, and circuit breakers. It proactively prevents bad actors from executing malicious on-chain actions through compromised AI agents.

Built for the [Chainlink Convergence Hackathon](https://chain.link/) (Feb 2026).

**Tracks:** Risk & Compliance · CRE & AI · Privacy

---

## Table of Contents

- [Gas Analysis](#gas-analysis)
- [Consensus Failure Modes](#consensus-failure-modes)
- [Formal Security Properties](#formal-security-properties)
- [Smart Contracts](#smart-contracts)
  - [SentinelGuardian.sol](#sentinelguardiansol)
  - [AgentRegistry.sol](#agentregistrysol)
  - [PolicyLib.sol](#policylibsol)
  - [Interfaces](#interfaces)
- [CRE Workflow](#cre-workflow)
- [Mock API Server](#mock-api-server)
- [Agent Simulators](#agent-simulators)
- [Dashboard](#dashboard)
- [Demo Scenarios](#demo-scenarios)
- [Chainlink Services Used](#chainlink-services-used)
- [Security Model](#security-model)
- [Test Coverage](#test-coverage)
- [Tech Stack](#tech-stack)
- [Quick Start](#quick-start)
- [Project Structure](#project-structure)
- [Known Limitations](#known-limitations)

---

## Deployed Contracts (Tenderly Virtual TestNet — Sepolia Fork)

| Contract | Address |
|----------|---------|
| **SentinelGuardian** | [`0x5F938e4c62991Eb4af3Dd89097978A1f376e6CC8`](https://dashboard.tenderly.co/) |
| **AgentRegistry** | [`0xFA7deF53FEaC45dB96A5B15C32ca4E6B009b25e6`](https://dashboard.tenderly.co/) |

**Deployer:** `0x23fC03ec91D319e4Aa14e90b6d3664540FDf2446`
**Network:** Sepolia (Chain ID 11155111) via Tenderly Virtual TestNet

---

## Gas Analysis

All gas measurements taken on Tenderly Virtual TestNet (Sepolia fork) with Solidity 0.8.24, optimizer at 200 runs.

### processVerdict() — Core Verdict Path

| Outcome | Gas Used | Notes |
|---------|----------|-------|
| Approved (all checks pass) | ~85,000 | ABI decode + 7 PolicyLib checks + stat updates + event emit |
| Denied (value violation) | ~120,000 | Same as above + circuit breaker + incident log + severity classification + challenge window creation + 4 events |
| Denied (critical severity) | ~110,000 | No challenge window created (permanent freeze) |

**Breakdown of an approved verdict:**
| Operation | Gas |
|-----------|-----|
| ABI decode reportData | ~3,000 |
| PolicyLib.checkAll() | ~25,000 (7 checks, short-circuits on failure) |
| _recordApprovedAction() | ~22,000 (storage writes: totalApproved, dailyVolume, rate limit window) |
| ActionApproved event | ~2,500 |
| Storage reads (policy, state) | ~10,000 |

**Key insight:** The circuit breaker path costs ~35,000 more gas than the approval path due to incident logging (string storage), challenge window creation, and 4 event emissions. This is acceptable because denials are the minority case in normal operation.

### Other Functions

| Function | Gas | Notes |
|----------|-----|-------|
| registerAgent() | ~180,000 | High due to dynamic array storage (approvedContracts, blockedFunctions) |
| challengeVerdict() | ~45,000 | Status update + event |
| resolveChallenge() (overturn) | ~55,000 | Unfreeze + status update + event |
| finalizeExpiredChallenge() | ~30,000 | Status update only |
| freezeAgent() (manual) | ~75,000 | State change + incident log + event |

### Cost Per Verdict at Scale

At current Ethereum gas prices (~30 gwei):
- **Approved verdict:** ~$0.08
- **Denied verdict:** ~$0.12
- On L2s (Arbitrum, Base): <$0.001 per verdict

## Consensus Failure Modes

### What Happens When DON Nodes Disagree

SentinelCRE uses `ConsensusAggregationByFields` with `identical` aggregation on the `verdict` field. This means ALL DON nodes must independently get the same AI evaluation result.

| Failure Mode | Cause | SentinelCRE Response |
|-------------|-------|---------------------|
| AI non-determinism | Despite `temperature: 0`, model output varies slightly across DON nodes | Consensus fails → `.result()` throws → fail-safe DENY |
| Network partition | Some DON nodes cannot reach AI endpoint | Nodes that fail return DENIED by default → verdict mismatch → consensus fails → DENY |
| API rate limiting | AI endpoint throttles some nodes but not others | Some nodes get HTTP 429 → default DENIED → mismatch → DENY |
| Stale block data | DON nodes read policy from different block heights | Mitigated by `LAST_FINALIZED_BLOCK_NUMBER` — all nodes read from same finalized block |
| Config desync | Nodes have different workflow configs | Prevented by CRE's atomic workflow deployment |

**Design principle:** Every consensus failure mode defaults to DENY. SentinelCRE never approves an action unless ALL DON nodes independently confirm that BOTH AI models approved it.

### Temperature 0 and Determinism

AI models are called with `temperature: 0` to maximize output determinism across DON nodes. This works because:
1. All nodes send the identical prompt (same proposal + same policy data from same finalized block)
2. `temperature: 0` selects the highest-probability token at each step
3. `ConsensusAggregationByFields` compares the verdict field (a simple string: "APPROVED" or "DENIED"), not the full response

The `confidence` field uses `median` aggregation (not `identical`) to absorb minor numeric differences across nodes.

## Formal Security Properties

### Property 1: No Unauthorized Execution
**Invariant:** An agent action can only execute if `processVerdict(reportData)` is called by a `WORKFLOW_ROLE` address with `approved = true` AND `PolicyLib.checkAll()` returns `(true, "")`.

**Enforcement:** `AccessControl` role check on `processVerdict()` + `whenNotPaused` modifier. Even if the CRE workflow sends `approved: true`, the on-chain PolicyLib independently validates all 7 policy checks. A compromised CRE workflow cannot bypass on-chain policy.

### Property 2: Bounded Damage
**Invariant:** The maximum financial damage from a single compromised agent in any 24-hour period is capped at `min(maxTransactionValue, maxDailyVolume)`.

**Enforcement:** `PolicyLib.checkValue()` caps per-transaction value. `_recordApprovedAction()` tracks cumulative `dailyVolume` with a 86400-second window reset. Rate limiting (`checkRateLimit`) bounds transaction count.

### Property 3: Fail-Safe Default
**Invariant:** Any error in the verdict pipeline results in DENY. The system never approves on uncertainty.

**Enforcement chain:**
1. CRE workflow: try/catch wraps entire pipeline → catch returns `{verdict: "DENIED"}`
2. AI response parsing: any JSON parse failure → default `{verdict: "DENIED", confidence: 0}`
3. DON consensus: any node disagreement → consensus failure → DENY
4. On-chain: `processVerdict` with `approved: true` still runs `PolicyLib.checkAll()` → any check failure → circuit breaker

### Property 4: Irreversible Severity Escalation
**Invariant:** A `Critical` severity incident cannot be appealed or overturned.

**Enforcement:** `_classifySeverity()` returns `Critical` for value > 10x policy limit OR PolicyViolation type. Critical severity skips challenge window creation. `challengeVerdict()` requires `status == Pending` and `block.timestamp < expiresAt` — neither condition can be true for critical incidents.

### Property 5: Frozen Origin Baseline Integrity
**Invariant:** Once an agent's behavioral baseline is frozen (after N approved actions), it cannot be modified by subsequent agent behavior.

**Enforcement:** The behavioral engine stores `originMean` and `originStdDev` separately from the rolling statistics. After the learning phase (default: 5 actions), origin values are frozen and all future actions are compared against the frozen origin, not the rolling average. This prevents "boiling frog" attacks where an agent gradually shifts its own baseline.

---

## Smart Contracts

### SentinelGuardian.sol

**Location:** `contracts/src/SentinelGuardian.sol`
**Inheritance:** OpenZeppelin `AccessControl` + `Pausable`
**Compiler:** Solidity 0.8.24

The core guardian contract. Receives CRE verdicts, enforces on-chain policy, triggers circuit breakers, manages agent lifecycle, and handles challenge windows.

#### Roles

| Role | Purpose |
|------|---------|
| `DEFAULT_ADMIN_ROLE` | Register/freeze/unfreeze/revoke agents, update policies, pause contract |
| `WORKFLOW_ROLE` | Process verdicts from CRE workflow, freeze agents, resolve challenges |
| `CHALLENGER_ROLE` | Appeal denied verdicts during challenge windows |

#### Enums

```solidity
enum AgentState { Active, Frozen, Revoked }
enum IncidentType { PolicyViolation, ConsensusFailure, RateLimit, AnomalyDetected, ManualFreeze }
```

#### Key Structs

```solidity
struct IncidentLog {
    uint64 timestamp;
    bytes32 agentId;
    IncidentType incidentType;
    string reason;
    address targetContract;
    uint256 attemptedValue;
}
```

#### State Variables

| Variable | Type | Purpose |
|----------|------|---------|
| `agentStates` | `mapping(bytes32 => AgentState)` | Current state per agent |
| `agentExists` | `mapping(bytes32 => bool)` | Whether agent is registered |
| `_agentPolicies` | `mapping(bytes32 => AgentPolicy)` | Per-agent policy configuration |
| `actionCounts` | `mapping(bytes32 => uint256)` | Actions in current rate limit window |
| `windowStartTimes` | `mapping(bytes32 => uint256)` | Rate limit window start timestamp |
| `dailyVolume` | `mapping(bytes32 => uint256)` | Accumulated daily volume (wei) |
| `cumulativeMints` | `mapping(bytes32 => uint256)` | Total tokens minted (for PoR tracking) |
| `totalApproved` | `mapping(bytes32 => uint256)` | Lifetime approved action count |
| `totalDenied` | `mapping(bytes32 => uint256)` | Lifetime denied action count |
| `_incidents` | `mapping(bytes32 => IncidentLog[])` | Rolling incident buffer (max 100) |
| `_challenges` | `mapping(bytes32 => ChallengeWindow)` | Active challenge windows |

#### Functions

**Verdict Processing**

| Function | Access | Description |
|----------|--------|-------------|
| `processVerdict(bytes calldata reportData)` | `WORKFLOW_ROLE`, `whenNotPaused` | Core entry point. Decodes ABI-encoded verdict from CRE workflow containing `(agentId, approved, reason, targetContract, targetFunction, value, mintAmount)`. If AI approved, runs `PolicyLib.checkAll()` for on-chain validation. If all checks pass, records approved action and emits `ActionApproved`. If any check fails or AI denied, triggers circuit breaker — freezes agent, logs incident, classifies severity, opens challenge window. |

**Agent Lifecycle**

| Function | Access | Description |
|----------|--------|-------------|
| `registerAgent(bytes32 agentId, AgentPolicy calldata policy)` | `DEFAULT_ADMIN_ROLE` | Registers a new agent with its policy. Requires `policy.isActive == true`. Sets agent state to `Active`. Stores approved contracts and blocked functions. Emits `AgentRegistered`. |
| `updatePolicy(bytes32 agentId, AgentPolicy calldata policy)` | `DEFAULT_ADMIN_ROLE` | Updates an existing agent's policy. Overwrites all policy fields including dynamic arrays. Emits `PolicyUpdated`. |
| `freezeAgent(bytes32 agentId)` | `WORKFLOW_ROLE` or `DEFAULT_ADMIN_ROLE` | Manually freezes an agent. If called by admin, logs a `ManualFreeze` incident. Sets state to `Frozen`. Emits `AgentFrozen`. |
| `unfreezeAgent(bytes32 agentId)` | `DEFAULT_ADMIN_ROLE` | Unfreezes a frozen agent. Requires current state is `Frozen`. Sets state back to `Active`. Emits `AgentUnfrozen`. |
| `revokeAgent(bytes32 agentId)` | `DEFAULT_ADMIN_ROLE` | Permanently revokes an agent. Cannot be unfrozen after this. Emits `AgentRevoked`. |

**Challenge System**

| Function | Access | Description |
|----------|--------|-------------|
| `challengeVerdict(bytes32 agentId)` | `CHALLENGER_ROLE` or `DEFAULT_ADMIN_ROLE` | Appeals a denied verdict during its challenge window. Requires status is `Pending` and `block.timestamp < expiresAt`. Sets status to `Appealed`. Emits `ChallengeAppealed`. |
| `resolveChallenge(bytes32 agentId, bool approved, string calldata reason)` | `WORKFLOW_ROLE` | Resolves an appealed challenge via CRE re-evaluation. If approved: sets status to `Overturned`, unfreezes agent. If denied: sets status to `Upheld`, keeps frozen. Emits `ChallengeResolved`. |
| `finalizeExpiredChallenge(bytes32 agentId)` | Anyone | Finalizes a challenge window that has expired without appeal. Requires `block.timestamp >= expiresAt` and status is `Pending`. Sets status to `Expired`. Callable by anyone (including Chainlink Automation). |

**Administrative**

| Function | Access | Description |
|----------|--------|-------------|
| `pause()` | `DEFAULT_ADMIN_ROLE` | Pauses all verdict processing (emergency stop) |
| `unpause()` | `DEFAULT_ADMIN_ROLE` | Resumes verdict processing |

**View Functions**

| Function | Returns | Description |
|----------|---------|-------------|
| `getAgentPolicy(bytes32 agentId)` | Policy fields | Returns all policy parameters for an agent |
| `getApprovedContracts(bytes32 agentId)` | `address[]` | Returns the whitelist of approved target contracts |
| `getBlockedFunctions(bytes32 agentId)` | `bytes4[]` | Returns the blocklist of forbidden function selectors |
| `getAgentState(bytes32 agentId)` | `AgentState` | Returns current state (Active/Frozen/Revoked) |
| `isAgentActive(bytes32 agentId)` | `bool` | Returns true only if state is Active |
| `getIncidentCount(bytes32 agentId)` | `uint256` | Number of incidents logged for this agent |
| `getIncident(bytes32 agentId, uint256 index)` | `IncidentLog` | Returns a specific incident by index |
| `getActionStats(bytes32 agentId)` | `(approved, denied, windowActions, dailyVolume)` | Returns approval/denial counts and current window stats |
| `getChallenge(bytes32 agentId)` | `ChallengeWindow` | Returns the current challenge window details |

**Internal Functions**

| Function | Description |
|----------|-------------|
| `_triggerCircuitBreaker(agentId, reason, target, value, incidentType)` | Freezes agent, increments `totalDenied`, classifies severity, creates challenge window (if not Critical), emits `ActionDenied`, `CircuitBreakerTriggered`, `AgentFrozen`, and `ChallengeCreated` events |
| `_classifySeverity(agentId, incidentType, value)` | **Critical:** value > 10x policy limit OR PolicyViolation type. **Medium:** ConsensusFailure with value > 2x limit. **Low:** everything else |
| `_logIncident(agentId, reason, target, value, incidentType)` | Creates `IncidentLog` and pushes to rolling buffer (max 100 per agent) |
| `_recordApprovedAction(agentId, value, mintAmount)` | Increments `totalApproved`, tracks `cumulativeMints`, manages rate limit window (resets if expired), manages daily volume window (resets after 86400s) |
| `_setPolicy(agentId, policy)` | Deep copies all policy fields including dynamic arrays to storage |

#### Events

```solidity
event ActionApproved(bytes32 indexed agentId, address target, uint256 value, uint256 timestamp);
event ActionDenied(bytes32 indexed agentId, address target, uint256 value, string reason, uint256 timestamp);
event CircuitBreakerTriggered(bytes32 indexed agentId, string reason, IncidentType incidentType, uint256 timestamp);
event AgentRegistered(bytes32 indexed agentId, uint256 timestamp);
event AgentFrozen(bytes32 indexed agentId, uint256 timestamp);
event AgentUnfrozen(bytes32 indexed agentId, uint256 timestamp);
event AgentRevoked(bytes32 indexed agentId, uint256 timestamp);
event PolicyUpdated(bytes32 indexed agentId, uint256 timestamp);
event ChallengeCreated(bytes32 indexed agentId, Severity severity, uint64 expiresAt);
event ChallengeAppealed(bytes32 indexed agentId, uint256 timestamp);
event ChallengeResolved(bytes32 indexed agentId, ChallengeStatus result, uint256 timestamp);
```

---

### AgentRegistry.sol

**Location:** `contracts/src/AgentRegistry.sol`
**Inheritance:** OpenZeppelin `Ownable`

Simple registry mapping agent IDs to metadata. Separate from the guardian to allow independent upgrades and to keep the guardian focused on security logic.

#### Struct

```solidity
struct AgentMetadata {
    string name;
    string description;
    address owner;
    uint64 registeredAt;
    bool exists;
}
```

#### Functions

| Function | Access | Description |
|----------|--------|-------------|
| `registerAgent(bytes32 agentId, string name, string description)` | Anyone | Registers a new agent. Requires `!_agents[agentId].exists`. Sets `owner = msg.sender`, `registeredAt = block.timestamp`. Pushes `agentId` to the enumeration array. Emits `AgentRegistered`. |
| `getAgent(bytes32 agentId)` | View | Returns full `AgentMetadata` struct |
| `getAgentCount()` | View | Returns total number of registered agents |
| `getAgentIdAt(uint256 index)` | View | Returns the agent ID at a given index (for enumeration) |
| `isRegistered(bytes32 agentId)` | View | Returns true if agent exists |

---

### PolicyLib.sol

**Location:** `contracts/src/libraries/PolicyLib.sol`

Pure validation library with no storage. Uses the `CheckParams` struct to batch parameters and avoid stack-too-deep errors. Every check returns `(bool passed, string memory reason)`.

#### AgentPolicy Struct

```solidity
struct AgentPolicy {
    uint256 maxTransactionValue;    // Max wei per single transaction
    uint256 maxDailyVolume;         // Max wei per 24-hour window
    uint256 maxMintAmount;          // Max tokens per single mint
    uint256 rateLimit;              // Max actions per window
    uint256 rateLimitWindow;        // Window duration in seconds
    address[] approvedContracts;    // Whitelisted target contracts
    bytes4[] blockedFunctions;      // Forbidden function selectors
    bool requireMultiAiConsensus;   // Require dual-AI agreement
    bool isActive;                  // Policy enabled flag
    address reserveFeed;            // Chainlink Data Feed for PoR
    uint256 minReserveRatio;        // Required reserve ratio (basis points, 10000 = 100%)
}
```

#### CheckParams Struct

```solidity
struct CheckParams {
    address target;         // Target contract address
    bytes4 funcSig;         // Function selector being called
    uint256 value;          // ETH value in wei
    uint256 mintAmount;     // Tokens to mint
    uint256 actionCount;    // Actions in current window
    uint256 windowStart;    // Window start timestamp
    uint256 currentTime;    // Current block.timestamp
    uint256 cumulativeMints; // Total mints to date
}
```

#### Validation Functions

| Function | Validates | Fails When |
|----------|-----------|------------|
| `checkValue(policy, value)` | Transaction value | `value > policy.maxTransactionValue` |
| `checkTarget(policy, target)` | Contract whitelist | Target not in `policy.approvedContracts` (skipped if whitelist is empty) |
| `checkFunction(policy, funcSig)` | Function blocklist | `funcSig` found in `policy.blockedFunctions` |
| `checkRateLimit(policy, actionCount, windowStart, currentTime)` | Rate limiting | `actionCount >= policy.rateLimit` within active window (skipped if `rateLimit == 0`) |
| `checkMintAmount(policy, mintAmount)` | Mint cap | `mintAmount > policy.maxMintAmount` (skipped if `maxMintAmount == 0`) |
| `checkReserves(policy, mintAmount, cumulativeMints)` | Proof of Reserves | Calls `reserveFeed.latestRoundData()`, fails if reserves < `(cumulativeMints + mintAmount) * minReserveRatio / 10000` |
| `checkAll(policy, params)` | All of the above | Runs checks in sequence, returns on first failure with reason string |

---

### Interfaces

#### ISentinelGuardian.sol
Read-only interface for external contracts to query agent state:
```solidity
function getAgentState(bytes32 agentId) external view returns (uint8);
function getIncidentCount(bytes32 agentId) external view returns (uint256);
function isAgentActive(bytes32 agentId) external view returns (bool);
```

#### IChallenge.sol
Defines the challenge system types:
- **Severity:** `Low` (1-hour appeal window), `Medium` (30-minute window), `Critical` (no appeal — permanent freeze)
- **ChallengeStatus:** `None`, `Pending`, `Appealed`, `Upheld`, `Overturned`, `Expired`
- **ChallengeWindow** struct: `agentId`, `createdAt`, `expiresAt`, `status`, `severity`, `originalVerdictData`, `reason`

#### IAggregatorV3.sol
Standard Chainlink Data Feed interface for Proof of Reserves:
```solidity
function latestRoundData() external view returns (uint80, int256 answer, uint256, uint256, uint80);
function decimals() external view returns (uint8);
```

---

## CRE Workflow

**Location:** `sentinel-workflow/main.ts`

The CRE workflow is the off-chain orchestration layer that connects AI evaluation with on-chain policy enforcement.

### Capabilities Used

| Capability | Purpose |
|------------|---------|
| **HTTPClient** | Calls 2 AI models (Claude + GPT-4) for independent evaluation |
| **EVMClient** | Reads agent policies from SentinelGuardian, writes verdicts on-chain |
| **CronCapability** | Periodic health checks, auto-freeze anomalous agents |
| **ConsensusAggregationByFields** | Ensures DON nodes agree on AI verdict (BFT consensus) |
| **Confidential HTTP** | Hides API keys, behavioral scoring weights, and AI evaluation prompts from DON nodes and agents |

### Triggers

| Trigger | Handler | Description |
|---------|---------|-------------|
| HTTP | `onActionProposal` | Receives an `ActionProposal` from an AI agent, evaluates it, writes verdict |
| Cron | `onHealthCheck` | Periodic health check (extensible for anomaly detection) |

### HTTP Handler Flow (`onActionProposal`)

1. **Parse** — Extracts `ActionProposal` from HTTP payload: `{agentId, targetContract, functionSignature, value, mintAmount, calldata, description}`
2. **Read Policy** — EVMClient calls `SentinelGuardian.getAgentPolicy(agentId)` to get the agent's limits
3. **Build Prompt** — Constructs a multi-shot evaluation prompt including the proposal details and policy context (limits, whitelists, blocklists)
4. **AI Evaluation** — Calls both AI endpoints via HTTPClient with `temperature: 0` for deterministic DON consensus. Both models return `{verdict, confidence, reason}`
5. **Consensus** — Both models must return `APPROVED` for the action to pass. Any `DENIED` → overall `DENIED`
6. **Encode Verdict** — ABI-encodes `(agentId, approved, reason, targetContract, functionSignature, value, mintAmount)` as report data
7. **Write On-Chain** — EVMClient calls `SentinelGuardian.processVerdict(reportData)`
8. **Return** — JSON response with `{status, agentId, verdict, confidence, reason}`

### Confidential Compute Boundaries

The workflow uses `ConfidentialHTTPClient` (feature-flagged) to hide sensitive evaluation data inside the TEE:
- API keys for AI model endpoints (injected via Vault DON `{{TEMPLATE}}` syntax)
- Behavioral scoring weights, anomaly thresholds, and frozen origin baselines
- AI evaluation prompts containing risk context and policy data
- AI model responses (confidence scores, reasoning, risk categories)

**Note:** Layer 1 on-chain policy parameters (value limits, approved contracts, blocked functions) are publicly readable from `SentinelGuardian.getAgentPolicy()` — this is by design for transparent compliance. The defense-in-depth architecture ensures that knowing Layer 1 limits does not help bypass Layer 2 behavioral detection or Layer 3 AI evaluation.

---

## Mock API Server

**Location:** `api-server/server.ts`
**Port:** 3002

Deterministic AI evaluation endpoints that simulate Claude and GPT-4 responses. Uses rule-based detection for consistent demo results.

### Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/evaluate/model1` | POST | Simulates Claude evaluation |
| `/evaluate/model2` | POST | Simulates GPT-4 evaluation |
| `/challenge/evaluate` | POST | More lenient re-evaluation for appeals |
| `/health` | GET | Server health check |

### Detection Rules

| Check | Threshold | Confidence |
|-------|-----------|------------|
| Value violation | > 1 ETH | 98% |
| Mint violation | > 1M tokens (1e24 wei) | 99% |
| Unapproved target | Not in approved list | 95% |
| Blocked function | In blocklist (incl. `upgradeTo`, `renounceOwnership`) | 97% |
| Delegatecall/proxy | Pattern detection | 99% |
| Prompt injection | "IGNORE PREVIOUS", "transfer all funds" patterns | 99% |
| Flash loan | Pattern detection | 98% |
| Admin functions | `upgradeTo`, `setImplementation`, etc. | 96% |
| Combined suspicious | Value near limit + significant mint | 85% |
| Safe (default) | All checks pass | 92% |

---

## Agent Simulators

### Normal Agent (`agent-simulator/normal-agent.ts`)

Simulates a well-behaved AI agent executing 4 legitimate actions:
1. Swap 0.5 ETH on approved DEX → **APPROVED**
2. Approve DEX for 1000 USDC → **APPROVED**
3. Swap 0.2 ETH for DAI → **APPROVED**
4. Mint 500K tokens (within 1M cap) → **APPROVED**

### Rogue Agent (`agent-simulator/rogue-agent.ts`)

Simulates a compromised agent executing 10 attack scenarios:

| # | Attack | Description | Expected Detection |
|---|--------|-------------|-------------------|
| 1 | Massive Value Swap | 100 ETH (limit: 1 ETH) | Value exceeds max |
| 2 | Unapproved Contract | Calls unknown address | Target not approved |
| 3 | Blocked Function | Calls `0xff00ff00` selector | Function blocked |
| 4 | Rapid-Fire | 20 transactions in 2 seconds | Rate limit exceeded |
| 5 | Infinite Mint | 1 BILLION tokens (cap: 1M) | Mint cap violated |
| 6 | Delegatecall Drain | Treasury drain via proxy | Delegatecall detected |
| 7 | Prompt Injection | "IGNORE PREVIOUS INSTRUCTIONS" | Injection pattern |
| 8 | Flash Loan | 10,000 ETH oracle manipulation | Flash loan pattern |
| 9 | Insider Threat | 0.9 ETH + 500K tokens (gradual) | Combined suspicion |
| 10 | Social Engineering | Admin `upgradeTo` as "maintenance" | Admin function blocked |

### Behavioral Simulators

```bash
bun run demo:probing    # Sequential probing → caught at probe 3
bun run demo:drift      # 20-step slow drift → caught at ~probe 16
```

These simulators demonstrate Layer 2 behavioral detection catching attacks that pass all Layer 1 policy checks.

---

## Dashboard

**Location:** `dashboard/`
**Stack:** Next.js 15 + React 19 + Tailwind CSS 4 + viem

Interactive dashboard for monitoring, demoing, and simulating SentinelCRE.

### Tabs

| Tab | Subtitle | Description |
|-----|----------|-------------|
| **Architecture** | 3-layer defense | Problem statement with real DeFi exploits ($3.4B stolen in 2025, $625M Ronin, $320M Wormhole), three-layer defense diagram, 6-step verdict pipeline, 7 Chainlink integration cards with LIVE/READY status, expandable smart contracts with Solidity snippets, 7 behavioral dimension breakdown with weight bars, tech stack grid |
| **Live Demo** | 15 attack scenarios | 3-phase narrative demo (Train → Test → Prove) with 14 scenario buttons (3 safe + 11 attacks), 8-step CRE pipeline animation, dual-AI verdict display (Claude + GPT-4), 7-dimension behavioral risk breakdown, "Run All Attacks" master button |
| **Guardian** | Agent monitoring | Wallet info bar (deployer + contract addresses), session performance metrics (detection rate, false positive rate, avg latency, $ prevented), 6-stat session bar, agent profile cards with behavioral score sparklines, threat timeline with phase dividers, defense analytics charts (donut, severity bars, risk histogram, defense layer stacked bar), filterable incident detail log |
| **Simulator** | Security console | Enterprise Security Console with 3 company presets (Coinbase: 6 agents, Aave: 4 agents, Lido: 4 agents) + custom mode. Agent fleet grid, editable policy parameters (value limits, mint caps, rate limiting, daily volume, PoR), cumulative behavioral score meter (CSS gradient gauge), action queue per agent, lockout banner at score 70+, summary stats (attacks blocked, safe ops approved, value protected) |

### Key Components

| Component | Description |
|-----------|-------------|
| `DemoControlPanel` | Main demo panel — 3 scenario categories (Safe, Common Attacks, Advanced Attacks), "Run All Attacks" button, 8-step CRE pipeline animation, dual-AI verdict display, behavioral risk breakdown |
| `VerdictFeedPanel` | Live verdict history with consensus details, anomaly scores, and layer catch info |
| `GuardianStatsBar` | 6 session metrics: verdicts (approved/denied), threats blocked, catch rate, agent status, avg risk score, defense coverage (layers triggered) |
| `AgentRegistryPanel` | Agent profile cards (TradingBot + MintBot) with behavioral score trend sparklines, session stats overlay, freeze status, and policy details |
| `ThreatTimeline` | Chronological threat events with phase dividers (Training → Policy Violations → Edge Cases) |
| `IncidentDetailLog` | Filterable incident log merging on-chain incidents with session verdicts, layer catch details |
| `BehavioralTrainingPanel` | Enterprise simulator — preset selector, agent fleet grid, policy editor, action queue, score meter, lockout system |
| `PolicyEditor` | Editable policy overrides: value limits, mint caps, target whitelist, function blocklist, rate limiting, daily volume, Proof of Reserves (enabled/ratio/staleness) |
| `ScoreMeter` | Cumulative behavioral risk score gauge (0-100) with CSS gradient (green → yellow → red) |
| `ActionQueue` | Per-agent scenario list organized by category (safe/common/advanced attacks) |

### API Routes

| Route | Method | Description |
|-------|--------|-------------|
| `/api/agents` | GET | Reads all agents from on-chain AgentRegistry + SentinelGuardian via Tenderly RPC |
| `/api/incidents` | GET | Reads incident history for a specific agent from on-chain data |
| `/api/evaluate` | POST | Forwards proposal to mock API server for AI evaluation, runs deterministic behavioral scoring, writes verdicts on-chain via Tenderly |
| `/api/simulate` | POST | Simulates a transaction via Tenderly Simulation API — returns gas, events, state changes |
| `/api/challenge` | POST | Submits challenge appeal for CRE re-evaluation |
| `/api/health` | GET | Checks mock API server connectivity |
| `/api/tenderly` | GET | Reads recent Tenderly transactions for live feed panel |

### Tenderly Integration — Deep Usage

Tenderly is deeply integrated across the entire stack — not just as a deployment target, but as the simulation engine, debugging tool, and live monitoring backend that powers the dashboard.

#### Virtual TestNet (Deployment & RPC)

All contracts are deployed on Tenderly's Virtual Sepolia TestNet (Sepolia fork, chain ID 11155111). The dashboard reads all on-chain state — agent registrations, policies, incident history, verdict events — via the Tenderly RPC endpoint. Every demo verdict fires real `processVerdict()` and `unfreezeAgent()` transactions that persist across sessions.

**Why Virtual TestNet was essential:**
- Pre-funded accounts eliminate faucet hunting and testnet unreliability
- Instant transactions enable responsive demo UX (no block confirmation delays)
- Persistent state means judges can inspect all historical transactions without re-deploying
- Full Sepolia EVM compatibility (gas pricing, precompiles, storage model)

#### Simulation API (`dashboard/src/lib/tenderly.ts` — 244 lines)

The Tenderly Pro API client wraps `/simulate` and `/simulate-bundle` endpoints:

```typescript
// Single transaction simulation — used by /api/simulate
simulateTransaction(tx: SimulationRequest): Promise<SimulationResult>

// Sequential multi-tx simulation with shared state — used by enterprise simulator
simulateBundle(transactions: SimulationRequest[]): Promise<SimulationResult[]>
```

**SimulationResult** includes:
- `success` / `revertReason` — whether processVerdict succeeded or which policy check failed
- `gasUsed` — exact gas for the verdict path (approved ~85K, denied ~120K)
- `stateChanges[]` — decoded storage diffs (agent state, incident count, frozen status, challenge windows)
- `balanceChanges[]` — ETH balance diffs per address
- `callTrace` — recursive internal call tree (CALL → STATICCALL → DELEGATECALL) with decoded inputs/outputs
- `logs[]` — decoded event emissions (VerdictProcessed, AgentFrozen, IncidentLogged, ChallengeCreated)

The `/api/simulate` route accepts two modes:
1. **Proposal mode** — auto-encodes `processVerdict(reportData)` calldata from agent/target/value/mint parameters
2. **Custom mode** — arbitrary `to`/`input`/`value` for direct contract interaction

#### Live Transaction Feed (`TenderlyFeedPanel.tsx`)

The dashboard includes a real-time Tenderly transaction monitor:
- `/api/tenderly` route scans the last 60 blocks via RPC (`eth_blockNumber` + `eth_getBlockByNumber`)
- Decodes transaction calldata to identify function calls by 4-byte selector
- Color-coded function names: `processVerdict` (yellow), `unfreezeAgent` (cyan), `registerAgent` (green), `grantRole` (blue), `updatePolicy` (orange)
- Polls every 12 seconds with cumulative transaction counts per contract
- Direct link to [Tenderly Explorer](https://dashboard.tenderly.co/project-waja/sentinelcre/testnet/9c734d91-b707-484a-a7be-db55b67eac02/transactions) for full decoded transaction inspection

#### Development & Debugging

Tenderly's transaction debugging was critical during development:
- Decoded call traces identified exactly where `processVerdict()` reverted during PolicyLib integration
- State diff inspection verified circuit breaker logic wrote to correct storage slots
- Gas profiling informed the check-ordering optimization in `PolicyLib.checkAll()` (cheapest checks first for early exit)

---

## Demo Scenarios

### Live Demo Tab — 3 Phases, 14 Scenarios

**Phase 1 — Training Baseline** (all APPROVED — system learns what "normal" looks like):

| # | Scenario | Agent | Purpose |
|---|----------|-------|---------|
| 0 | Normal Trade (0.5 ETH swap) | TradingBot | Establishes value baseline |
| -1 | Normal Mint (500K tokens) | MintBot | Establishes mint baseline |
| — | Token Approval | TradingBot | Establishes contract interaction baseline |

**Phase 2 — Policy Violations** (all DENIED — obvious attacks any risk system should catch):

| # | Attack | Detection Method | Severity |
|---|--------|-----------------|----------|
| 1 | Compromised Wallet Drain (100 ETH) | Value policy violation | Medium |
| 2 | Infinite Mint (1B tokens) | Mint cap + AI pattern detection | Critical |
| 3 | Prompt Injection ("IGNORE PREVIOUS") | Dual-AI independently detects injection | Medium |
| 4 | Flash Loan Oracle Manipulation | Target whitelist + value limit + AI | Critical |
| 5 | Stealth Proxy Upgrade | Function blocklist (defense-in-depth) | Low |

**Phase 3 — Edge Cases: Would Slip Traditional Security** (all DENIED — only behavioral scoring catches these):

| # | Attack | Why Traditional Security Misses It | Behavioral Dimension |
|---|--------|-----------------------------------|---------------------|
| 6 | Sequential Probing (2→4→8 ETH) | Each value is within policy limits | Sequential Probing [REDACTED] |
| 7 | Off-Hours Emergency Drain | 0.8 ETH on approved DEX | Time-of-Day [REDACTED] |
| 8 | Velocity Burst (16 rapid txns) | Each 0.1 ETH passes all checks | Velocity [REDACTED] |
| 9 | Multi-Contract Scatter | Small value, legitimate function | Contract Diversity [REDACTED] |
| 10 | Sybil Coordination (900K mint) | Under 1M policy cap | Value Deviation [REDACTED] |
| 11 | Slow Drift Injection (0.5→2.5 ETH) | Each step within 1σ of rolling avg | Cumulative Drift [REDACTED] |

### Enterprise Simulator (Simulator Tab)

3 company presets with role-specific agents and attack scenarios:

| Preset | Agents | Safe Scenarios | Attack Scenarios |
|--------|--------|---------------|-----------------|
| **Coinbase Institutional** | 6 (Treasury, Trading, Lending, Staking, Bridge, Compliance) | 4 | 6 |
| **Aave Protocol** | 4 (Liquidation Bot, Governance, Rate Oracle, Reserve Manager) | 3 | 6 |
| **Lido Finance** | 4 (Staking Router, Oracle, Withdrawal Manager, Treasury) | 3 | 6 |
| **Total** | **14 agents** | **10** | **18** |

Enterprise attacks are role-specific: treasury redirect, cold wallet drain, ownership takeover, flash loan manipulation, MEV sandwich, oracle price feed attack, rogue validator deposit, PoR reserve drain, proxy upgrade attempt, and more.

---

## Chainlink Services Used

| Service | Usage | Status |
|---------|-------|--------|
| **CRE Workflow** | Orchestration backbone — HTTP trigger receives proposals, Cron trigger for health checks | Real |
| **CRE HTTPClient** | Calls 2 AI models with `ConsensusAggregationByFields` for identical verdict consensus | Real |
| **CRE EVMClient** | Reads agent policies, writes verdicts to SentinelGuardian contract on-chain | Real |
| **CRE CronCapability** | Periodic health checks — auto-freeze anomalous agents | Real |
| **Data Feeds** | `AggregatorV3Interface` for Proof of Reserves — verifies reserve backing before mints | Real |
| **Automation** | `finalizeExpiredChallenge()` follows checkUpkeep/performUpkeep pattern — ready to register | Interface ready |
| **Confidential HTTP** | Hides API keys, behavioral scoring weights, and AI evaluation prompts from DON nodes | Real (SDK alpha) |
| **Confidential Compute** | Hide Layer 2/3 evaluation logic from agents (on-chain Layer 1 params remain transparent) | Feature-flagged |

### Why CRE?

CRE provides exactly what SentinelCRE needs:
- **BFT Consensus** — Multiple DON nodes must agree on AI verdicts (no single point of failure)
- **HTTPClient** — Native multi-endpoint consensus for calling 2+ AI models
- **EVMClient** — Read policies and write verdicts without external infrastructure
- **Confidential HTTP** — Hide behavioral scoring weights and AI evaluation prompts so agents can't reverse-engineer Layer 2/3 criteria
- **ConsensusAggregationByFields** — DON nodes compare AI verdicts field-by-field for deterministic agreement

---

## Security Model

SentinelCRE uses a **fail-safe** design:

| Principle | Implementation |
|-----------|----------------|
| **Default deny** | Any error in the pipeline defaults to DENY |
| **Unanimous consensus** | Both AI models must approve — one dissent blocks the action |
| **AI cannot override policy** | On-chain `PolicyLib.checkAll()` runs even if both AI models approve |
| **Severity-based response** | Critical → instant permanent freeze. Low/Medium → time-gapped challenge window |
| **Proof of Reserves** | Mints checked against Chainlink Data Feed. Cumulative tracking prevents gradual depletion |
| **Immutable incidents** | Rolling buffer (max 100 per agent) cannot be modified or deleted |
| **Rate limiting** | Per-window action count + daily volume accumulation with automatic reset |
| **Pausable** | Emergency stop via `pause()` halts all verdict processing |
| **Confidential evaluation** | Layer 2 behavioral thresholds and Layer 3 AI evaluation criteria hidden inside TEE via ConfidentialHTTPClient — agents can read on-chain policy (Layer 1) but cannot see behavioral scoring weights, anomaly thresholds, or AI prompts |

---

## Test Coverage

**85 tests across 5 suites — all passing**

| Test Suite | Tests | Coverage |
|------------|-------|----------|
| `SentinelGuardian.t.sol` | 45 | Registration, verdicts, policy enforcement, circuit breaker, freeze/unfreeze/revoke, rate limits, daily volume, cumulative mints |
| `Challenge.t.sol` | 14 | Severity classification, challenge window creation, appeals, resolution (uphold/overturn), expiry, authorization checks |
| `ProofOfReserves.t.sol` | 10 | Reserve verification, cumulative tracking, feed manipulation, collateral ratios, zero-mint bypass |
| `AgentRegistry.t.sol` | 8 | Registration, enumeration, duplicate prevention, metadata retrieval |
| `Integration.t.sol` | 8 | Full lifecycle: register → approve → deny → freeze → challenge → resolve, infinite mint blocked end-to-end |

```bash
cd contracts && forge test -v
# [PASS] 85 tests across 5 suites
```

---

## Tech Stack

| Component | Technology |
|-----------|------------|
| CRE SDK | `@chainlink/cre-sdk` v1.0.9 |
| Solidity | 0.8.24 via Foundry |
| OpenZeppelin | v5.5.0 (AccessControl, Pausable) |
| forge-std | v1.14.0 |
| Runtime | Bun |
| Contract interaction | viem |
| Config validation | Zod |
| Dashboard | Next.js 15 + React 19 + Tailwind CSS 4 |
| Simulation & Deployment | Tenderly Virtual TestNet (RPC + deployment), Simulation API (`/simulate` + `/simulate-bundle`), live tx monitoring |

---

## Quick Start

### Prerequisites
- [Foundry](https://book.getfoundry.sh/getting-started/installation)
- [Bun](https://bun.sh/)

### Install
```bash
cd SentinelCRE
bun install
```

### Build & Test Contracts
```bash
cd contracts
forge build
forge test -v
```

### Run Dashboard

> **No testnet funds needed.** Pre-configured with Tenderly Virtual TestNet.

```bash
# Terminal 1: Start mock AI evaluation server
bun run mock-api

# Terminal 2: Start the interactive dashboard
bun run dashboard
# Open http://localhost:3000 — Risk Monitoring Dashboard
# Open http://localhost:3000/presentation — Slide Deck
```

### Run CLI Demo
```bash
# Terminal 1: Start mock AI evaluation server
bun run mock-api

# Terminal 2: Run normal agent (all actions approved)
bun run demo:normal

# Terminal 3: Run rogue agent (10 attacks blocked)
bun run demo:rogue

# Reset behavioral profiles between runs
bun run behavioral:reset
```

### Deploy
```bash
# Set environment variables
export DEPLOYER_PRIVATE_KEY=0x...
export RPC_URL=https://...

# Deploy via Foundry
cd contracts
forge script script/Deploy.s.sol --rpc-url $RPC_URL --broadcast

# Or deploy via TypeScript
bun run deploy:contracts
```

---

## Project Structure

```
SentinelCRE/
├── contracts/                        # Foundry root
│   ├── src/
│   │   ├── SentinelGuardian.sol      # Core guardian (AccessControl + Pausable)
│   │   ├── AgentRegistry.sol         # Agent registration (Ownable)
│   │   ├── interfaces/
│   │   │   ├── ISentinelGuardian.sol # Read-only query interface
│   │   │   ├── IChallenge.sol        # Severity, ChallengeStatus, ChallengeWindow
│   │   │   └── IAggregatorV3.sol     # Chainlink Data Feed interface
│   │   └── libraries/
│   │       └── PolicyLib.sol         # Policy validation (7 checks + checkAll)
│   ├── test/                         # 85 Foundry tests
│   │   ├── SentinelGuardian.t.sol    # 45 tests
│   │   ├── AgentRegistry.t.sol       # 8 tests
│   │   ├── Challenge.t.sol           # 14 tests
│   │   ├── Integration.t.sol         # 8 tests
│   │   ├── ProofOfReserves.t.sol     # 10 tests
│   │   └── mocks/
│   │       └── MockV3Aggregator.sol  # Mock Chainlink Data Feed
│   ├── script/
│   │   └── Deploy.s.sol              # Deployment script
│   └── foundry.toml                  # Solidity 0.8.24, optimizer 200 runs
├── sentinel-workflow/
│   ├── main.ts                       # CRE workflow (HTTP + Cron triggers)
│   └── behavioral.ts                 # 7-dimension behavioral anomaly engine
├── api-server/
│   └── server.ts                     # Mock AI evaluation server (port 3002)
├── agent-simulator/
│   ├── normal-agent.ts               # 4 legitimate actions
│   └── rogue-agent.ts                # 10 attack scenarios
├── dashboard/                        # Next.js 15 interactive dashboard
│   ├── src/
│   │   ├── app/
│   │   │   ├── page.tsx              # Server wrapper → HomeClient
│   │   │   ├── presentation/         # Slide deck route
│   │   │   ├── api/                  # API routes
│   │   │   │   ├── agents/route.ts   # On-chain agent reads
│   │   │   │   ├── evaluate/route.ts # AI evaluation + behavioral scoring
│   │   │   │   ├── simulate/route.ts # Tenderly simulation
│   │   │   │   ├── challenge/route.ts # Challenge appeals
│   │   │   │   ├── incidents/route.ts # On-chain incident reads
│   │   │   │   ├── tenderly/route.ts # Tenderly transaction feed
│   │   │   │   ├── behavioral/reset/ # Behavioral profile reset
│   │   │   │   └── health/route.ts   # Mock API health check
│   │   │   ├── layout.tsx            # Shell with navbar
│   │   │   └── globals.css           # Animations
│   │   ├── components/
│   │   │   ├── HomeClient.tsx        # Main dashboard (4 tabs)
│   │   │   ├── DemoControlPanel.tsx   # 3-phase demo (14 scenarios)
│   │   │   ├── VerdictFeedPanel.tsx   # Live verdict history
│   │   │   ├── AgentRegistryPanel.tsx # Agent cards with policies
│   │   │   ├── TabNavigation.tsx      # Tab bar
│   │   │   ├── TenderlyFeedPanel.tsx  # Live Tenderly transaction feed
│   │   │   ├── guardian/             # Guardian tab components
│   │   │   │   ├── GuardianTab.tsx   # Guardian tab coordinator
│   │   │   │   ├── GuardianStatsBar.tsx # 6-stat session bar
│   │   │   │   ├── AgentProfileCards.tsx # Agent profiles with sparklines
│   │   │   │   ├── ThreatTimeline.tsx # Chronological threat events
│   │   │   │   ├── DefenseAnalyticsCharts.tsx # Analytics charts
│   │   │   │   └── IncidentDetailLog.tsx # Filterable incident log
│   │   │   ├── simulator/            # Enterprise simulator components
│   │   │   │   ├── BehavioralTrainingPanel.tsx # Enterprise console
│   │   │   │   ├── PolicyEditor.tsx  # Editable policy overrides
│   │   │   │   ├── ScoreMeter.tsx    # Behavioral risk gauge
│   │   │   │   └── ActionQueue.tsx   # Per-agent scenario list
│   │   │   └── slides/               # 10 presentation slides
│   │   ├── hooks/
│   │   │   ├── useSentinelData.ts    # On-chain data polling
│   │   │   └── useVerdictHistory.ts  # Session verdict state
│   │   └── lib/
│   │       ├── contracts.ts          # ABIs + addresses
│   │       ├── demo-scenarios.ts     # 14 demo + 28 enterprise scenarios
│   │       └── tenderly.ts           # Tenderly API helper
│   └── package.json
├── config/
│   ├── sentinel.config.json          # Production CRE config
│   ├── sentinel.local.config.json    # Local dev config
│   └── fixtures/                     # Test fixtures
├── docs/                             # Architecture + reference docs
│   ├── ARCHITECTURE.md               # 3-layer defense diagrams
│   ├── CRE_INTEGRATION.md            # CRE code-level walkthrough
│   ├── CONFIDENTIAL-COMPUTE.md       # CC integration details
│   ├── SECURITY_MODEL.md             # Threat model + defense layers
│   ├── INTEGRATION-GUIDE.md          # Company onboarding guide
│   └── CHALLENGES.md                 # Development challenges
├── package.json                      # Root scripts
├── README.md
├── TECHNICAL.md
└── tsconfig.json
```

---

## Known Limitations

| Limitation | Impact | Mitigation |
|-----------|--------|-----------|
| **Single-chain deployment** | Currently Sepolia only; no cross-chain agent monitoring | EVMClient supports any CRE-supported chain. Multi-chain deployment is a config change, not a code change |
| **No ReentrancyGuard** | SentinelGuardian uses AccessControl + Pausable but not ReentrancyGuard | All state-changing functions are role-gated (WORKFLOW_ROLE/ADMIN). External calls only happen in PolicyLib.checkReserves() which is a read-only Data Feed call |
| **MEV vulnerability** | processVerdict() transactions can be front-run by MEV searchers | The verdict itself is binary (approve/deny) — front-running a denial provides no economic advantage. Approval front-running is mitigated by the agent executing the approved action, not the verdict submitter |
| **AI model latency** | Dual-AI evaluation adds ~2-5s latency per verdict | Acceptable for most agent operations. High-frequency agents (arbitrage bots) may need dedicated fast-path policies |
| **Behavioral cold start** | New agents have no behavioral baseline for first 5 actions | During learning phase, only Layer 1 (policy) and Layer 3 (AI consensus) are active. Policy limits bound damage during cold start |
| **Incident buffer overflow** | Rolling buffer limited to 100 incidents per agent | Sufficient for operational monitoring. Historical analysis should use event logs (unlimited, indexed) |

---

## Demo Video

> Video link: *Coming soon*

## Team

**Willis Tang** — @ProjectWaja | Project Waja

## License

MIT
