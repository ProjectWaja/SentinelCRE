# SentinelCRE — Confidential Compute Integration

## Overview

Chainlink Confidential Compute (CC) is a breakthrough privacy service built natively into CRE. SentinelCRE leverages CC to make guardrail evaluation fundamentally opaque to the AI agents being protected.

**Status**: Confidential HTTP is in **Experimental / Early Access** (available Feb 16, 2026). This document describes both the current implementation and the production upgrade path.

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

**Confidential Compute upgrade** (Feb 16+ Early Access):
```typescript
// [CONFIDENTIAL_COMPUTE] Policy retrieved inside TEE
// Node operators CANNOT see the decrypted value
// Policy is encrypted in Vault DON with DKG threshold encryption
const confClient = new ConfidentialHTTPClient();

// Option A: Policy stored in Vault DON directly
const policy = runtime.getConfidentialSecret("agent_policy_0").result();

// Option B: Policy retrieved from external encrypted store via Confidential HTTP
const policyResponse = confClient.sendRequest({
  url: config.policyEndpoint,
  method: "GET",
  confidentialHeaders: {
    "Authorization": `Bearer ${runtime.getSecret("policy_api_key").result()}`
  },
  responseExtraction: { path: "policy" }
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

**Confidential Compute upgrade** (Feb 16+ Early Access):
```typescript
// [CONFIDENTIAL_COMPUTE] AI calls via Confidential HTTP
// API key hidden, prompt hidden, full response hidden
// Only extracted verdict field exits TEE
const confClient = new ConfidentialHTTPClient();

const claudeResult = confClient.sendRequest({
  url: "https://api.anthropic.com/v1/messages",
  method: "POST",
  confidentialHeaders: {
    "x-api-key": runtime.getConfidentialSecret("anthropic_api_key").result(),
    "Content-Type": "application/json",
    "anthropic-version": "2023-06-01"
  },
  body: JSON.stringify({
    model: "claude-sonnet-4-20250514",
    temperature: 0,
    max_tokens: 500,
    messages: [{ role: "user", content: evaluationPrompt }]
  }),
  // CRITICAL: Only the verdict JSON exits the TEE
  // The full response (including reasoning, token usage, etc.) stays inside
  responseExtraction: { path: "content[0].text" }
}).result();
```

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

### Phase 1: Standard Implementation (Now)
Build the full workflow using `runInNodeMode` + `runtime.getSecret()`. This is battle-tested and guaranteed to work with CRE simulation and deployment.

### Phase 2: CC Layer (Feb 16+)
Add Confidential HTTP as an upgrade layer. Keep the standard implementation as a fallback. Use feature flags:

```typescript
const USE_CONFIDENTIAL_HTTP = config.enableConfidentialCompute ?? false;

if (USE_CONFIDENTIAL_HTTP) {
  // Confidential HTTP path
  verdict = evaluateWithConfidentialHTTP(runtime, action);
} else {
  // Standard runInNodeMode path
  verdict = runtime
    .runInNodeMode(fetchAIEvaluation, consensusIdenticalAggregation<AIVerdict>())()
    .result();
}
```

### Phase 3: Production CC (General Access 2026)
Full Vault DON integration with DKG threshold encryption for all secrets, custom enclave deployment, and multi-party incident report decryption.

## What's Available Now vs. Later

| Feature | Early Access (Feb 2026) | General Access (Later 2026) |
|---------|------------------------|----------------------------|
| Confidential HTTP | ✅ Yes | ✅ Yes |
| Basic Vault DON secrets | ✅ Yes | ✅ Yes |
| TEE execution markers | ✅ Yes | ✅ Yes |
| Attestation proofs | ✅ Expected | ✅ Yes |
| Custom DKG threshold encryption | ❓ Possibly | ✅ Yes |
| Custom enclave deployment | ❌ No | ✅ Yes |
| Multi-party confidential compute | ❌ No | ✅ Yes |
| Production SLA guarantees | ❌ No | ✅ Yes |

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
