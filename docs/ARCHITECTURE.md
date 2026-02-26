# SentinelCRE — Architecture

## System Overview

SentinelCRE is a decentralized AI guardrail protocol that sits between AI agents and on-chain execution. It evaluates every proposed action through three independent defense layers before allowing or blocking it.

```mermaid
graph TD
    A[AI Agent] -->|Proposes action| B[HTTP Trigger]
    B --> C{CRE Workflow — TEE}
    
    C --> D[1. Policy Engine]
    D -->|FAIL| J[DENIED — Circuit Breaker]
    D -->|PASS| E[2. Behavioral Analysis]
    
    E -->|FLAGGED| J
    E -->|PASS| F[3. Multi-AI Consensus]
    
    F -->|DENIED| J
    F -->|APPROVED| G[Attested Verdict]
    
    G --> H[SentinelGuardian.sol]
    H --> I[Action Forwarded to Target Contract]
    
    J --> K[SentinelGuardian.sol]
    K --> L[Agent Frozen]
    K --> M[Incident Logged]
    K --> N[Alert Event Emitted]
    
    style C fill:#1a1a2e,stroke:#e94560,color:#fff
    style D fill:#0f3460,stroke:#e94560,color:#fff
    style E fill:#0f3460,stroke:#e94560,color:#fff
    style F fill:#0f3460,stroke:#e94560,color:#fff
    style J fill:#e94560,stroke:#fff,color:#fff
    style I fill:#16c79a,stroke:#fff,color:#fff
```

## Defense Layers

### Layer 1: Policy Engine (Deterministic, Fast)

Hard-coded guardrails that are evaluated locally within the TEE. No network calls required. Sub-millisecond execution.

| Check | Description | Example |
|-------|-------------|---------|
| Value Limit | Max per-transaction value | 100 ETH |
| Approved Contracts | Whitelist of allowed targets | Uniswap Router, Aave Pool |
| Blacklisted Functions | Blocked function signatures | `selfdestruct`, `delegatecall` |
| Rate Limiting | Max actions per time window | 20 per hour |
| Cumulative Value | Max total value per window | 500 ETH per 24h |

**Confidential Compute**: All thresholds are stored encrypted in Vault DON. The agent cannot read its own limits.

### Layer 2: Behavioral Analysis (Statistical, Adaptive)

Pattern-based anomaly detection that catches attacks even when individual actions stay within policy limits.

```mermaid
graph LR
    A[Proposed Action] --> B{Value Deviation}
    A --> C{Contract Diversity}
    A --> D{Velocity Scoring}
    A --> E{Function Pattern}
    A --> F{Time-of-Day}
    A --> G{Sequential Probing}
    
    B --> H[Anomaly Score]
    C --> H
    D --> H
    E --> H
    F --> H
    G --> H
    
    H -->|Score >= threshold| I[FLAGGED]
    H -->|Score < threshold| J[PASS]
```

| Dimension | What It Detects | Detection |
|-----------|----------------|-------------|
| Value Deviation | Transaction value > 2.5σ from historical mean | [REDACTED] |
| Contract Diversity | First interaction with unknown contract | [REDACTED] |
| Velocity | Action submitted in < 50% of expected interval | [REDACTED] |
| Function Pattern | Unusual function signature for this agent | [REDACTED] |
| Time-of-Day | Activity outside agent's normal hours | [REDACTED] |
| Sequential Probing | 3+ monotonically increasing values (binary search detection) | [REDACTED] |

**Key insight**: A threshold-only system can be binary-searched. Behavioral analysis detects the search pattern itself within 3-4 probes. The probing detection dimension (+[REDACTED]) is the highest-weighted signal because it directly counters the primary attack vector against invisible thresholds.

### Layer 3: Multi-AI Consensus (Independent, Redundant)

Two independent AI models evaluate the action with full context. Both must agree the action is safe.

```mermaid
sequenceDiagram
    participant W as CRE Workflow (TEE)
    participant C as Claude (Confidential HTTP)
    participant M as Model 2 (Confidential HTTP)
    participant G as SentinelGuardian.sol
    
    W->>W: Build evaluation context<br/>(action + behavioral profile + policy result)
    
    par Parallel AI Evaluation
        W->>C: Evaluate action [encrypted prompt]
        C-->>W: {verdict, confidence, risk_category}
    and
        W->>M: Evaluate action [encrypted prompt]
        M-->>W: {verdict, confidence, risk_category}
    end
    
    W->>W: Consensus check (identical aggregation)
    
    alt Both APPROVED
        W->>G: processVerdict(reportData) [approved=true]
        G-->>W: Action forwarded, stats updated
    else Any DENIED or Disagreement
        W->>G: processVerdict(reportData) [approved=false]
        G->>G: Circuit breaker → freeze agent, log incident
    end
```

**Confidential Compute**: API credentials AND evaluation prompts are hidden inside the TEE. Node operators cannot see which AI models are being called, what prompts are being used, or what context is being evaluated. Only the verdict exits.

**Consensus rule**: `consensusIdenticalAggregation` — all DON nodes must report the same verdict. If any node disagrees (due to non-deterministic AI output), consensus fails → DEFAULT DENY.

**Temperature**: All AI calls use `temperature: 0` for maximum determinism across nodes.

## Smart Contract Architecture

```mermaid
classDiagram
    class SentinelGuardian {
        +mapping~bytes32 => AgentState~ agentStates
        +mapping~bytes32 => bool~ agentExists
        +mapping~bytes32 => AgentPolicy~ _agentPolicies
        +mapping~bytes32 => uint256~ totalApproved
        +mapping~bytes32 => uint256~ totalDenied
        +mapping~bytes32 => uint256~ dailyVolume
        +mapping~bytes32 => IncidentLog[]~ _incidents
        +mapping~bytes32 => ChallengeWindow~ _challenges

        +processVerdict(bytes reportData)
        +registerAgent(bytes32 agentId, AgentPolicy policy)
        +updatePolicy(bytes32 agentId, AgentPolicy policy)
        +freezeAgent(bytes32 agentId)
        +unfreezeAgent(bytes32 agentId)
        +revokeAgent(bytes32 agentId)
        +challengeVerdict(bytes32 agentId)
        +resolveChallenge(bytes32 agentId, bool approved, string reason)
        +finalizeExpiredChallenge(bytes32 agentId)
        +getAgentPolicy(bytes32 agentId) AgentPolicy
        +getAgentState(bytes32 agentId) AgentState
        +getActionStats(bytes32 agentId) (uint256, uint256, uint256, uint256)
        +getIncident(bytes32 agentId, uint256 index) IncidentLog
    }

    class AgentState {
        <<enumeration>>
        Active
        Frozen
        Revoked
    }

    class AgentPolicy {
        +uint256 maxTransactionValue
        +uint256 maxDailyVolume
        +uint256 maxMintAmount
        +uint256 rateLimit
        +uint256 rateLimitWindow
        +address[] approvedContracts
        +bytes4[] blockedFunctions
        +bool requireMultiAiConsensus
        +bool isActive
        +address reserveFeed
        +uint256 minReserveRatio
    }

    class IncidentLog {
        +uint64 timestamp
        +bytes32 agentId
        +IncidentType incidentType
        +string reason
        +address targetContract
        +uint256 attemptedValue
    }

    class ChallengeWindow {
        +bytes32 agentId
        +uint64 createdAt
        +uint64 expiresAt
        +ChallengeStatus status
        +Severity severity
        +string reason
    }

    class PolicyLib {
        +checkValue(policy, value) (bool, string)
        +checkTarget(policy, target) (bool, string)
        +checkFunction(policy, funcSig) (bool, string)
        +checkRateLimit(policy, count, start, now) (bool, string)
        +checkMintAmount(policy, amount) (bool, string)
        +checkReserves(policy, mint, cumMints) (bool, string)
        +checkAll(policy, CheckParams) (bool, string)
    }

    SentinelGuardian --> AgentState
    SentinelGuardian --> AgentPolicy
    SentinelGuardian --> IncidentLog
    SentinelGuardian --> ChallengeWindow
    SentinelGuardian ..> PolicyLib : uses
```

**Access control**: Three roles govern the contract — `DEFAULT_ADMIN_ROLE` (register/freeze/revoke agents, update policies), `WORKFLOW_ROLE` (process CRE verdicts, freeze agents, resolve challenges), and `CHALLENGER_ROLE` (appeal denied verdicts). Only the authorized CRE workflow can submit verdicts.

**Fail-safe principle**: The contract enforces that absence of verdict = denial by default. If the workflow is unavailable, no actions can be approved. All errors in `processVerdict()` trigger the circuit breaker rather than silently failing.

## Confidential Compute Integration Map

```mermaid
graph TB
    subgraph "Visible (On-Chain)"
        V1[Verdict: APPROVED/DENIED]
        V2[Risk Score: 0-100]
        V3[Action Hash]
        V4[Attestation Hash]
        V5[Incident Hash]
        V6[Agent Status: frozen/active]
    end
    
    subgraph "Hidden (Inside TEE / Vault DON)"
        H1[Policy thresholds & limits]
        H2[Behavioral analysis parameters]
        H3[Anomaly score threshold]
        H4[AI model API credentials]
        H5[Evaluation prompts & context]
        H6[AI reasoning & confidence details]
        H7[Full incident forensic report]
        H8[Historical behavior profile]
    end
    
    style V1 fill:#16c79a,stroke:#fff,color:#000
    style V2 fill:#16c79a,stroke:#fff,color:#000
    style V3 fill:#16c79a,stroke:#fff,color:#000
    style V4 fill:#16c79a,stroke:#fff,color:#000
    style V5 fill:#16c79a,stroke:#fff,color:#000
    style V6 fill:#16c79a,stroke:#fff,color:#000
    
    style H1 fill:#e94560,stroke:#fff,color:#fff
    style H2 fill:#e94560,stroke:#fff,color:#fff
    style H3 fill:#e94560,stroke:#fff,color:#fff
    style H4 fill:#e94560,stroke:#fff,color:#fff
    style H5 fill:#e94560,stroke:#fff,color:#fff
    style H6 fill:#e94560,stroke:#fff,color:#fff
    style H7 fill:#e94560,stroke:#fff,color:#fff
    style H8 fill:#e94560,stroke:#fff,color:#fff
```

**The agent sees green. Everything red is invisible.** This is the fundamental innovation — security through confidential constraints, not security through obscurity.

## Data Flow: Rogue Agent Scenario

```mermaid
sequenceDiagram
    participant RA as Rogue Agent
    participant HT as HTTP Trigger
    participant PE as Policy Engine
    participant BA as Behavioral Analysis
    participant AI as Multi-AI Consensus
    participant SG as SentinelGuardian.sol
    participant BC as Blockchain (Sepolia)
    
    RA->>HT: POST {target: 0xDEAD, fn: transferFrom, value: 500 ETH}
    HT->>PE: Evaluate against encrypted policy
    
    Note over PE: ❌ FAIL: Unapproved contract<br/>❌ FAIL: Value 625x average<br/>❌ FAIL: Blacklisted function
    
    PE->>BA: Policy failed — evaluate behavior anyway for forensics
    
    Note over BA: Anomaly score: 95/100<br/>+[REDACTED] (value 40σ from mean)<br/>+[REDACTED] (unknown contract)<br/>+[REDACTED] (unusual function)<br/>+10 (time anomaly)<br/>+10 (velocity spike)
    
    BA->>AI: Evaluate with full context
    
    par Confidential HTTP
        AI->>AI: Claude: DENIED (98% confidence, CRITICAL)
    and
        AI->>AI: Model 2: DENIED (96% confidence, CRITICAL)
    end
    
    Note over AI: Consensus: UNANIMOUS DENY
    
    AI->>SG: processVerdict(reportData) [approved=false, value=500 ETH]
    SG->>SG: _triggerCircuitBreaker()
    SG->>BC: AgentFrozen event
    SG->>BC: CircuitBreakerTriggered event
    
    Note over BC: Agent Zero is frozen.<br/>Incident hash logged on-chain.<br/>Full report encrypted in Vault DON.
    
    RA--xHT: Subsequent actions rejected<br/>(agent is frozen)
```

## Deployment Architecture

```
┌──────────────────────────────────────────────────┐
│                 CRE Platform                      │
│                                                   │
│  ┌────────────┐    ┌──────────────────────────┐  │
│  │ HTTP       │    │ Workflow DON              │  │
│  │ Trigger    │───▶│ (BFT Consensus)           │  │
│  │ Endpoint   │    │                           │  │
│  └────────────┘    │  ┌──────────────────────┐ │  │
│                    │  │ TEE (SGX/Nitro)      │ │  │
│                    │  │                      │ │  │
│  ┌────────────┐   │  │ Policy Engine        │ │  │
│  │ Vault DON  │◀──│──│ Behavioral Analysis  │ │  │
│  │ (Secrets)  │   │  │ AI Evaluation        │ │  │
│  └────────────┘   │  │                      │ │  │
│                    │  └──────────────────────┘ │  │
│                    └──────────────────────────┘  │
└────────────────────────┬─────────────────────────┘
                         │
                         ▼
            ┌────────────────────────┐
            │   Ethereum Sepolia     │
            │                        │
            │  SentinelGuardian.sol  │
            │  (Policy + Circuit     │
            │   Breaker + Registry)  │
            └────────────────────────┘
```

## Technology Stack

| Component | Technology | Why |
|-----------|-----------|-----|
| Orchestration | Chainlink CRE (TypeScript SDK) | Decentralized execution with BFT consensus |
| Privacy | Confidential HTTP + Vault DON | TEE-based confidential computation |
| Smart Contract | Solidity 0.8.24 (Foundry) | Policy enforcement + circuit breaker |
| AI Models | Claude + secondary model | Independent multi-model consensus |
| Chain | Ethereum Sepolia | Testnet for hackathon demo |
| Testing | CRE CLI simulation + Foundry | End-to-end workflow + contract testing |

## Ecosystem Positioning

SentinelCRE is infrastructure, not an application. It protects ANY AI agent on ANY protocol:

- **Coinbase x402**: AI agents paying for CRE workflow execution → SentinelCRE evaluates before execution
- **Aave Horizon**: Institutional DeFi agents → SentinelCRE ensures compliance and risk limits
- **Ondo Finance**: Tokenized fund management agents → SentinelCRE prevents unauthorized asset movement
- **Any AI-native protocol**: If it has an autonomous agent, it needs a guardrail layer
