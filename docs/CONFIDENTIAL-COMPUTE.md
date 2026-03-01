# SentinelCRE — Confidential Compute Integration

## Overview

Chainlink Confidential Compute (CC) is a breakthrough privacy service built natively into CRE. SentinelCRE leverages CC to make guardrail evaluation fundamentally opaque to the AI agents being protected.

**Status**: Confidential HTTP is **live** in `@chainlink/cre-sdk` v1.0.9+ (simulator support). SentinelCRE uses v1.0.9 with a feature-flagged `ConfidentialHTTPClient` implementation. See [SDK Reference](https://docs.chain.link/cre/reference/sdk/confidential-http-client-ts) and [Usage Guide](https://docs.chain.link/cre/guides/workflow/using-confidential-http-client/making-requests-ts).

## Why Confidential Compute Matters for SentinelCRE

Without CC, a sophisticated AI agent can:
1. **Read its own limits** — Policy parameters stored on-chain or in plaintext configs are inspectable
2. **Binary-search thresholds** — Submit incrementally larger transactions until one is denied, then calculate the exact limit
3. **Craft targeted injections** — If evaluation prompts are visible, inject adversarial content into calldata
4. **Front-run denials** — If evaluation logic is public, predict which actions will be denied before submitting

With CC, the agent sees **nothing**. It receives a single bit — APPROVED or DENIED — with no information about how close it was to any boundary, what criteria were evaluated, or what AI models were consulted.

## Integration Points

### 1. Confidential Policy Retrieval

**What's hidden**: Transaction value limits, approved contract whitelist, blacklisted function signatures, rate limit thresholds, cumulative value caps, behavioral anomaly score threshold

**Standard implementation** (works today):
```typescript
// Policy stored as CRE secret — accessible only via runtime.getSecret()
// Node operators can see the decrypted value during execution
const policyJson = runtime.getSecret("agent_policy_0").result();
const policy: AgentPolicy = JSON.parse(policyJson);
```

**Confidential Compute upgrade** (available in CRE SDK v1.0.9+):
```typescript
import { ConfidentialHTTPClient } from "@chainlink/cre-sdk";

// [CONFIDENTIAL_COMPUTE] Policy retrieved inside TEE
// Node operators CANNOT see the decrypted value
// Secrets injected via {{TEMPLATE}} syntax — never visible outside enclave
const confClient = new ConfidentialHTTPClient();

// Policy retrieved from external encrypted store via Confidential HTTP
// The {{POLICY_API_KEY}} template is resolved inside the TEE from DON-hosted secrets
const policyResponse = confClient.sendRequest({
  url: config.policyEndpoint,
  method: "GET",
  headers: {
    "Authorization": "Bearer {{POLICY_API_KEY}}"
  },
}).result();
```

**What changes**: The policy evaluation logic and thresholds execute inside a TEE. Even individual DON node operators cannot observe the policy parameters during execution. Only the final boolean verdict exits.

### 2. Confidential AI Model Calls

**What's hidden**: API credentials (API keys), evaluation prompts (containing agent behavioral history, portfolio data, recent actions), AI model responses (confidence scores, reasoning, risk categories)

**Standard implementation** (works today):
```typescript
// runInNodeMode gives access to secrets but node operators can see the call
const fetchAIEvaluation = (nodeRuntime: NodeRuntime<Config>): AIVerdict => {
  const httpClient = new HTTPClient();
  const apiKey = nodeRuntime.getSecret("anthropic_api_key");

  const response = httpClient.fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "Content-Type": "application/json",
      "anthropic-version": "2023-06-01"
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      temperature: 0,
      max_tokens: 500,
      messages: [{ role: "user", content: evaluationPrompt }]
    }),
    cacheSettings: { maxAgeMs: 5000 }
  });

  return parseVerdict(response);
};

const verdict = runtime
  .runInNodeMode(fetchAIEvaluation, consensusIdenticalAggregation<AIVerdict>())()
  .result();
```

**Confidential Compute upgrade** (implemented in `sentinel-workflow/main.ts`):
```typescript
import { ConfidentialHTTPClient } from "@chainlink/cre-sdk";

// [CONFIDENTIAL_COMPUTE] AI calls via Confidential HTTP
// API key hidden via {{TEMPLATE}} secret injection, prompt hidden, full response hidden
// Only the parsed AIVerdict exits the TEE after consensus aggregation
const confClient = new ConfidentialHTTPClient();

// Model 1: Claude via Anthropic API
const confRequest1 = {
  vaultDonSecrets: [{ key: 'ANTHROPIC_API_KEY', namespace: 'sentinel' }],
  request: {
    url: config.aiEndpoint1,
    method: 'POST',
    bodyString: claudeBody,  // Contains evaluation prompt — hidden inside TEE
    multiHeaders: {
      'Content-Type': { values: ['application/json'] },
      'x-api-key': { values: ['{{ANTHROPIC_API_KEY}}'] },  // Resolved from Vault DON
      'anthropic-version': { values: ['2023-06-01'] },
    },
  },
};

// Model 2: GPT-4 via OpenAI API — independent model for consensus diversity
const confRequest2 = {
  vaultDonSecrets: [{ key: 'OPENAI_API_KEY', namespace: 'sentinel' }],
  request: {
    url: config.aiEndpoint2,
    method: 'POST',
    bodyString: gptBody,
    multiHeaders: {
      'Content-Type': { values: ['application/json'] },
      Authorization: { values: ['Bearer {{OPENAI_API_KEY}}'] },
    },
  },
};

const response1 = sendRequester.sendRequest(confRequest1).result();
const response2 = sendRequester.sendRequest(confRequest2).result();
```

This is now implemented in `sentinel-workflow/main.ts` behind the `enableConfidentialCompute` feature flag.

**What changes**: The entire AI evaluation — prompt construction, API call, response parsing — happens inside a TEE. The AI models receive encrypted prompts containing sensitive agent context (behavioral history, portfolio data, transaction patterns) that would be valuable intelligence if leaked. Confidential HTTP ensures this intelligence never leaves the enclave.

### 3. Confidential Incident Logging

**What's hidden**: Full forensic details of denied actions (exactly which policy was violated, the behavioral anomaly breakdown, AI evaluation reasoning, the complete proposed action including calldata)

**Standard implementation** (works today):
```typescript
// Incident hash on-chain, full report available to workflow operator
const incidentHash = keccak256(abi.encodePacked(agentId, actionHash, attestationHash, timestamp));
// Full report logged via runtime.log() — visible to operator
runtime.log(`INCIDENT: ${JSON.stringify(fullReport)}`);
```

**Confidential Compute upgrade** (production):
```typescript
// [CONFIDENTIAL_COMPUTE] Full report encrypted for threshold auditor decryption
// Only hash goes on-chain
// Report encrypted in Vault DON — requires 2-of-3 auditor keys to decrypt
const encryptedReport = confClient.sendRequest({
  url: config.vaultEndpoint,
  method: "POST",
  confidentialHeaders: {
    "Authorization": runtime.getConfidentialSecret("vault_api_key").result()
  },
  body: JSON.stringify({
    key: `incident_${agentId}_${timestamp}`,
    value: JSON.stringify(fullReport),
    encryption: "threshold",
    decryptors: auditorPublicKeys,
    threshold: 2
  })
}).result();
```

**What changes**: Incident reports contain sensitive forensic data that reveals guardrail parameters. With CC, this data is encrypted at rest and requires multi-party authorization to decrypt — preventing a single compromised auditor from extracting the security model.

## Implementation Strategy

### Phase 1: Standard Implementation — COMPLETE
Full workflow using `HTTPClient.sendRequest()` with `ConsensusAggregationByFields`. Battle-tested with CRE simulation and mock API server.

### Phase 2: CC Layer — IMPLEMENTED
`ConfidentialHTTPClient` integrated behind `enableConfidentialCompute` feature flag in `sentinel-workflow/main.ts`. Standard path retained as fallback. Set `"enableConfidentialCompute": true` in config to activate.

```typescript
// In sentinel-workflow/main.ts — already implemented
if (config.enableConfidentialCompute) {
  aiVerdict = evaluateWithConfidentialHttp(runtime, config, proposal, policyContext, behavioralResult);
} else {
  // Standard HTTPClient path (fallback)
  const httpClient = new HTTPClient();
  aiVerdict = httpClient.sendRequest(runtime, /* ... */).result();
}
```

### Phase 3: Production CC (General Access 2026)
Full Vault DON integration with DKG threshold encryption for all secrets, custom enclave deployment, and multi-party incident report decryption.

## What's Available Now vs. Later

| Feature | CRE SDK v1.0.9 (Current) | SentinelCRE Status | General Access (Later 2026) |
|---------|----------------------|-------------------|----------------------------|
| Confidential HTTP | ✅ Live | ✅ Implemented | ✅ Yes |
| Secret template injection | ✅ Live | ✅ Implemented (`{{ANTHROPIC_API_KEY}}`) | ✅ Yes |
| Simulator support | ✅ Live (v1.0.9+) | ✅ Ready to test | ✅ Yes |
| TEE execution markers | ✅ Live | ✅ attestationHash in verdict | ✅ Yes |
| Attestation proofs | ✅ Expected | ⏳ Stub verification | ✅ Yes |
| Custom DKG threshold encryption | ❓ Possibly | ⏳ Designed, not integrated | ✅ Yes |
| Custom enclave deployment | ❌ Not yet | ❌ N/A | ✅ Yes |
| Multi-party confidential compute | ❌ Not yet | ❌ N/A | ✅ Yes |
| Production SLA guarantees | ❌ Not yet | ❌ N/A | ✅ Yes |

## Attestation Model

Every SentinelCRE verdict includes a cryptographic attestation proving:

1. **The correct workflow binary was executed** — enclave hash matches the deployed workflow
2. **The evaluation was performed by a legitimate DON** — DON signature on the report
3. **The result was not tampered with** — report digest matches the signed attestation
4. **The execution was timely** — timestamp within MAX_ATTESTATION_AGE of current block

```
Attestation Proof = {
  enclaveHash:    hash(workflow WASM binary),
  donSignature:   BFT threshold signature over report digest,
  timestamp:      runtime.now() at execution time,
  reportDigest:   keccak256(verdict, riskScore, agentId, actionHash)
}
```

On-chain verification in SentinelGuardian.sol:
```solidity
function verifyAttestation(bytes32 attestationHash) internal view returns (bool) {
    // In production: verify against registered enclave hashes and DON public keys
    // For hackathon: attestation hash is recorded for audit trail
    return attestationHash != bytes32(0);
}
```

## Security Properties Achieved

| Property | Without CC | With CC |
|----------|-----------|---------|
| Agent cannot execute unauthorized actions | ✅ | ✅ |
| Agent cannot see its own limits | ❌ (limits in secrets, but visible to operators) | ✅ |
| Agent cannot craft targeted prompt injections | ❌ (prompts visible during execution) | ✅ |
| Node operators cannot extract policy parameters | ❌ | ✅ |
| Incident forensics are access-controlled | ❌ (visible to operator) | ✅ |
| Evaluation integrity is cryptographically provable | Partial (DON consensus) | ✅ (TEE attestation) |
