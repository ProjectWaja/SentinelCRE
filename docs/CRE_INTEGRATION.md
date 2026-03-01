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

## Code-Level Walkthrough: Verdict Pipeline

The full verdict pipeline in `sentinel-workflow/main.ts` executes in 7 steps. Here's exactly how each CRE capability is used:

### Step 1: HTTP Trigger Receives Proposal

```typescript
const httpCapability = new HTTPCapability()
handler(httpCapability.trigger({ authorizedKeys: [] }), onActionProposal)
```

The workflow registers an HTTP trigger that receives `ActionProposal` payloads. The `authorizedKeys` field can restrict which signers can submit proposals in production.

### Step 2: EVMClient Reads Agent Policy

```typescript
const chainSelector = getNetwork({
  chainFamily: 'evm',
  chainSelectorName: config.evmChainSelectorName,
  isTestnet: true,
})
const evmClient = new EVMClient(chainSelector)

const policyCallData = encodeFunctionData({
  abi: GUARDIAN_ABI,
  functionName: 'getAgentPolicy',
  args: [proposal.agentId as `0x${string}`],
})

const policyResult = evmClient
  .callContract(runtime, {
    call: encodeCallMsg({
      from: zeroAddress,
      to: config.guardianContractAddress as Address,
      data: policyCallData,
    }),
    blockNumber: LAST_FINALIZED_BLOCK_NUMBER,
  })
  .result()
```

`LAST_FINALIZED_BLOCK_NUMBER` ensures all DON nodes read from the same finalized block — preventing consensus failures from block propagation delays.

### Step 3: Behavioral Risk Scoring (Layer 2)

```typescript
const behavioralResult = analyzeAll(proposal, behaviorCtx, now.getTime(), 50)
```

The behavioral engine (pure TypeScript, CRE WASM-compatible) runs 7 anomaly dimensions against the agent's behavioral context. The result is injected into the AI evaluation prompt so Layer 3 can factor behavioral intelligence into its verdict.

### Step 4: Feature-Flagged AI Evaluation (Standard vs. Confidential)

```typescript
if (config.enableConfidentialCompute) {
  const confClient = new ConfidentialHTTPClient()
  aiVerdict = confClient
    .sendRequest(
      runtime,
      (sendRequester: ConfidentialHTTPSendRequester) =>
        evaluateWithConfidentialHttp(sendRequester, config, proposal, policyContext, behavioralResult),
      ConsensusAggregationByFields<AIVerdict>({
        verdict: identical,    // All DON nodes must agree on APPROVED/DENIED
        confidence: median,    // Median confidence across nodes
        reason: identical,     // Consistent reasoning required
      }),
    )()
    .result()
} else {
  const httpClient = new HTTPClient()
  aiVerdict = httpClient
    .sendRequest(
      runtime,
      (sendRequester: HTTPSendRequester) =>
        evaluateWithStandardHttp(sendRequester, config, proposal, policyContext, behavioralResult),
      ConsensusAggregationByFields<AIVerdict>({
        verdict: identical,
        confidence: median,
        reason: identical,
      }),
    )()
    .result()
}
```

**Both paths use the same consensus aggregation strategy.** `ConsensusAggregationByFields` ensures DON nodes compare the AI verdict field-by-field:
- `verdict: identical` — all nodes must get the same APPROVED/DENIED result
- `confidence: median` — median smooths out minor floating-point differences
- `reason: identical` — ensures consistent reasoning across nodes

### Step 5: Confidential HTTP Secret Injection

Inside `evaluateWithConfidentialHttp()`, each AI model uses its own Vault DON secret:

```typescript
// Model 1: Claude — Anthropic API key
const confRequest1 = {
  vaultDonSecrets: [{ key: 'ANTHROPIC_API_KEY', namespace: 'sentinel' }],
  request: {
    url: config.aiEndpoint1,
    method: 'POST',
    bodyString: claudeBody,
    multiHeaders: {
      'x-api-key': { values: ['{{ANTHROPIC_API_KEY}}'] },
      'anthropic-version': { values: ['2023-06-01'] },
    },
  },
}

// Model 2: GPT-4 — OpenAI API key
const confRequest2 = {
  vaultDonSecrets: [{ key: 'OPENAI_API_KEY', namespace: 'sentinel' }],
  request: {
    url: config.aiEndpoint2,
    method: 'POST',
    bodyString: gptBody,
    multiHeaders: {
      Authorization: { values: ['Bearer {{OPENAI_API_KEY}}'] },
    },
  },
}
```

`{{ANTHROPIC_API_KEY}}` and `{{OPENAI_API_KEY}}` are resolved inside the TEE from Vault DON. Node operators never see the decrypted keys, the evaluation prompts, or the AI models' responses. Using two independent model providers ensures genuine consensus diversity.

### Step 6: ABI-Encode Verdict Report

```typescript
const reportBytes = encodeAbiParameters(
  parseAbiParameters(
    'bytes32 agentId, bool approved, string reason, address target, bytes4 funcSig, uint256 value, uint256 mintAmount',
  ),
  [
    proposal.agentId as `0x${string}`,
    approved,
    aiVerdict.reason,
    proposal.targetContract as Address,
    proposal.functionSignature as `0x${string}`,
    BigInt(proposal.value),
    BigInt(proposal.mintAmount),
  ],
)
```

The verdict is ABI-encoded so `SentinelGuardian.processVerdict(bytes reportData)` can `abi.decode` it on-chain and run `PolicyLib.checkAll()` against the decoded parameters.

### Step 7: EVMClient Writes Verdict On-Chain

```typescript
evmClient
  .writeReport(runtime, {
    to: config.guardianContractAddress as Address,
    data: writeCallData,
  })
  .result()
```

`writeReport()` submits a signed transaction as the CRE workflow's authorized address (must have `WORKFLOW_ROLE` on SentinelGuardian).

## DON Consensus Failure Handling

When DON nodes disagree on the AI verdict (e.g., non-deterministic AI output despite `temperature: 0`), the consensus aggregation fails. SentinelCRE handles this as a **fail-safe denial**:

1. **`identical` aggregation on `verdict` field** — If any DON node gets a different AI response, `ConsensusAggregationByFields` fails to reach consensus
2. **CRE runtime treats consensus failure as an error** — The `.result()` call throws
3. **All errors in the pipeline default to DENIED** — The try/catch wrapping returns a denial response
4. **This is intentional** — A consensus failure means we cannot be certain the AI approved the action, so the fail-safe default is denial

This means SentinelCRE never approves an action unless ALL DON nodes independently agree that BOTH AI models approved it.

## Cron Health Check

```typescript
const cronCapability = new CronCapability()
handler(cronCapability.trigger({ schedule: config.schedule }), onHealthCheck)
```

The health check runs on a configurable cron schedule (default: `*/5 * * * *`, every 5 minutes). In production, this would iterate registered agents via EVMClient reads and proactively freeze agents exhibiting anomalous patterns — providing defense beyond the request-response verdict pipeline.
