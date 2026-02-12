# SentinelCRE — CRE Integration Guide

## Why CRE?

Chainlink's Compute Runtime Environment (CRE) provides exactly the primitives SentinelCRE needs:

### 1. BFT Consensus for Multi-AI Validation
CRE runs on a Decentralized Oracle Network (DON) with Byzantine Fault Tolerant consensus. When SentinelCRE calls two AI models, the DON nodes independently execute the calls and must reach consensus on the results. This means:
- No single node can fake an AI verdict
- The system is resilient to node failures
- Verdicts are cryptographically signed by the DON

### 2. HTTPClient for AI Model Calls
CRE's `HTTPClient` with `ConsensusAggregationByFields` is purpose-built for our use case:
```typescript
httpClient.sendRequest(
  runtime,
  evaluateWithAI,
  ConsensusAggregationByFields<AIVerdict>({
    verdict: identical,    // All DON nodes must get same verdict
    confidence: median,    // Median across nodes
    reason: identical,     // Consistent reasoning
  }),
)
```

### 3. EVMClient for On-Chain Policy
CRE's `EVMClient` provides native contract interaction:
- `callContract()` — Read agent policies from SentinelGuardian
- `writeReport()` — Submit verdicts as signed reports

### 4. Confidential HTTP
CRE's `ConfidentialHTTPClient` ensures API keys and guardrail thresholds are not visible to individual DON nodes. This is critical because:
- API keys for Claude and other models stay secret
- Policy thresholds (value limits, rate limits) stay hidden
- AI agents cannot learn their own constraints by observing DON traffic

### 5. CronCapability for Health Monitoring
Periodic health checks run via `CronCapability`:
- Every 5 minutes, check all registered agents
- Auto-freeze agents exhibiting anomalous patterns
- Proactive defense, not just reactive

## CRE Workflow Architecture

```
sentinel-workflow/main.ts
├── initWorkflow(config)
│   ├── handler(HTTPCapability.trigger(), onActionProposal)
│   └── handler(CronCapability.trigger(), onHealthCheck)
│
├── onActionProposal(runtime, payload)
│   ├── Parse HTTP payload → ActionProposal
│   ├── EVMClient.callContract() → Read agent policy
│   ├── HTTPClient.sendRequest() → Multi-AI consensus
│   ├── encodeAbiParameters() → Build verdict report
│   └── EVMClient.writeReport() → Submit on-chain
│
└── onHealthCheck(runtime, payload)
    ├── EVMClient.callContract() → Read agent states
    └── Log health status
```

## SDK Patterns Used

### Config Validation (Zod)
```typescript
const configSchema = z.object({
  schedule: z.string(),
  guardianContractAddress: z.string(),
  aiEndpoint1: z.string(),
  aiEndpoint2: z.string(),
  // ...
})
```

### .result() Pattern (No async/await on capabilities)
```typescript
// Correct — CRE WASM compatible
const result = evmClient.callContract(runtime, { ... }).result()

// Wrong — breaks WASM compilation
const result = await evmClient.callContract(runtime, { ... })
```

### Runtime Utilities
```typescript
runtime.log('[SentinelCRE] ...')  // Logging (not console.log)
runtime.now()                      // Timestamp (not Date.now())
runtime.getSecret('API_KEY')       // Secrets (not process.env)
```

## Confidential Compute Boundaries

Production upgrade path marked in code:
```typescript
// --- [CONFIDENTIAL_COMPUTE_BOUNDARY_START] ---
// When CC SDK ships, wrap this block in:
//   confidentialRuntime.execute(fn, { visibility: 'attestation-only' })
const policyContext = { ... }
// --- [CONFIDENTIAL_COMPUTE_BOUNDARY_END] ---
```

This ensures SentinelCRE is ready for CC integration when the SDK reaches general availability.
