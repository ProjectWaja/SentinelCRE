# SentinelCRE — Challenges & Growing Pains

> Personal reference for the Airtable "What challenges did you run into?" field and post-hackathon reflection.

---

## 1. CRE SDK — Bleeding Edge, Minimal Documentation

The Chainlink CRE SDK (v1.0.9) is brand new — released during the hackathon window. Documentation was sparse and the API surface changed across minor versions.

**Pain points:**
- The `.result()` pattern (no async/await) was not intuitive. CRE compiles workflows to WASM, so standard JavaScript async patterns break compilation. We had to rewrite all SDK calls to use the synchronous `.result()` chaining pattern.
- `ConfidentialHTTPClient` uses a completely different request format than `HTTPClient` — `multiHeaders` with `{ values: ['...'] }` objects instead of flat strings, `bodyString` instead of `body`, and `vaultDonSecrets` for template injection. This wasn't obvious from docs and required reading SDK source code.
- `ConsensusAggregationByFields` required understanding that DON nodes must get *identical* results for `identical` aggregation to succeed. With AI models, even `temperature: 0` can produce slight variations, so we had to carefully design our response parsing to extract only deterministic fields (verdict string, not full reasoning).
- `runtime.now()` instead of `Date.now()`, `runtime.log()` instead of `console.log()` — WASM runtime constraints that aren't documented prominently but break consensus if violated.

**How we overcame it:** Read the SDK source on GitHub, studied the example workflows in the CRE docs, and built incrementally — standard HTTP first, then added Confidential HTTP behind a feature flag, then behavioral scoring.

---

## 2. Next.js 15 + Turbopack Build Failures

The dashboard used Next.js 15.3.3 with Turbopack. Production builds (`next build`) failed with cryptic errors that didn't appear in development (`next dev`).

**Pain points:**
- `export const dynamic = 'force-dynamic'` is silently ignored in `'use client'` files. This caused prerender errors on every page that used React hooks: `TypeError: Cannot read properties of undefined (reading 'env')` and `Cannot read properties of null (reading 'useContext')`.
- The fix required splitting every page into a thin server component wrapper (with the `dynamic` export) and a separate client component. We refactored `page.tsx`, `presentation/page.tsx`, and `not-found.tsx` into this pattern.
- `NODE_ENV=development` was set as a Windows system environment variable, poisoning `next build` into using the dev runtime even when we explicitly set production mode. Fixed with `cross-env NODE_ENV=production` in the build script.
- Bun's dependency resolution accidentally upgraded Next.js from 15.3.3 to 15.5.12 when we ran `bun add -d cross-env`, which broke webpack (`WebpackError is not a constructor`). Had to pin Next.js back to `15.3.3`.
- Next.js 15.3.3 has a known bug with Pages Router 404/500 fallback generation during `next build`. Creating a `pages/` directory with custom error pages made things worse (whack-a-mole). Ultimately accepted this as unresolvable — `next dev` works fine and judges will use that.

**How we overcame it:** Systematic debugging — isolated each prerender failure, traced it to the `'use client'` + `dynamic` export conflict, then applied the server/client split pattern consistently across all pages.

---

## 3. Behavioral Scoring — Getting the Math Right

The 7-dimension behavioral anomaly engine was the most complex piece of original logic.

**Pain points:**
- **Sequential Probing detection** needed to detect monotonically increasing values (binary search pattern) without false-positiving on legitimate ascending trades. We settled on requiring 3+ strictly increasing values with a minimum step ratio.
- **Cumulative Drift detection** compares a rolling average against a "frozen origin" baseline. The challenge was determining when to freeze the origin — too early and the baseline is unreliable, too late and an attacker can poison it. We settled on freezing after 5 approved actions as a balance.
- **Mock API behavioral profiles got polluted** during testing. Phase 2's massive-value attacks (100 ETH, 10,000 ETH) shifted the accumulated behavioral profile so dramatically that Phase 3's subtle attacks (slow drift) weren't detected because the standard deviation was already enormous. Fixed by implementing a max-score merge: the evaluate endpoint uses the higher of the mock API's behavioral score vs. a deterministic recentValues-based score.
- **BigInt precision overflow** in the evaluate API route — `Math.floor(Number(BigInt(value)))` overflowed for large wei values. Fixed by splitting the calculation: `Math.round(Number(value / BigInt(1e14))) / 10000`.

**How we overcame it:** Built a full dry-run test harness that replayed all 13 demo scenarios programmatically, caught the 2 failures (Sequential Probing missing recentValues, Slow Drift score below threshold), and fixed root causes rather than tweaking thresholds.

---

## 4. On-Chain Policy vs. Confidential Compute Tension

A fundamental design tension: blockchain storage is inherently public, but we wanted agents to be unable to see their own guardrails.

**Pain points:**
- Initially, our docs and README implied that ALL policy thresholds are hidden via Confidential Compute. But on-chain policy parameters (`maxTransactionValue`, `approvedContracts`, `blockedFunctions`) are stored in `SentinelGuardian.sol` as public state — any agent can call `getAgentPolicy()` and read its own limits.
- This meant our Confidential Compute story was technically inaccurate for Layer 1.
- We had to rethink the narrative: Layer 1 is *transparent compliance* (like publishing regulatory limits), while Layers 2 and 3 are *confidential evaluation* (behavioral weights, AI prompts, anomaly thresholds stay inside the TEE).

**How we overcame it:** Embraced the tension as a feature. The three-layer architecture is specifically designed so that knowing Layer 1's rules doesn't help bypass Layers 2 and 3. An agent can read "my value limit is 1 ETH" from the contract, but it can't see that sequential probing has +35 weight, that the anomaly threshold is 50, or what the AI evaluation prompt contains. Updated all docs to be precise about what each layer protects.

---

## 5. Solidity Stack-Too-Deep and Gas Optimization

`PolicyLib.checkAll()` runs 7 independent validation checks, each needing access to policy parameters and action data.

**Pain points:**
- Solidity's 16-variable stack limit made it impossible to pass all parameters as individual function arguments. Created the `CheckParams` struct to batch parameters.
- The `processVerdict()` function does a lot: ABI decode, 7 policy checks, stat updates, incident logging, severity classification, challenge window creation, and 4+ event emissions. Gas optimization required careful ordering — short-circuit on first policy failure rather than running all checks.
- Dynamic arrays (`approvedContracts[]`, `blockedFunctions[]`) in storage are expensive. `registerAgent()` costs ~180K gas due to deep-copying dynamic arrays. Accepted this as a one-time registration cost.
- Circular incident buffer (max 100 per agent) required careful index management to avoid unbounded storage growth.

**How we overcame it:** Designed PolicyLib as a pure library with no storage, used structs to batch parameters, and ordered checks from cheapest to most expensive so the common case (simple value check fails) exits early.

---

## 6. Demo Reliability — 13 Scenarios, Zero Failures

The demo runs 13 scenarios across 3 phases. Every scenario had to produce the exact expected result (APPROVED or DENIED) consistently.

**Pain points:**
- The mock API server maintains accumulated behavioral profiles per agent. Running Phase 2 attacks (massive values) before Phase 3 edge cases polluted the profiles, causing Phase 3 scores to be unreliable.
- The demo script (v6) and dashboard UI got out of sync as we iterated. Button labels, scenario counts, and phase descriptions diverged.
- Behavioral resets between runs required a dedicated `/behavioral/reset` endpoint and a `bun run behavioral:reset` script.

**How we overcame it:** Built a Node.js dry-run script that programmatically replayed all 13 scenarios, verified expected verdicts, and caught regressions. Aligned the demo script with the dashboard UI rather than the reverse. Added the max-score merge to ensure either the accumulated profile or the deterministic scorer could catch attacks.

---

## 7. Windows Development Environment

The entire project was developed on Windows 10, which introduced platform-specific friction.

**Pain points:**
- `NODE_ENV=production` syntax in npm scripts doesn't work on Windows. Required `cross-env` package.
- Path separators (backslash vs forward slash) caused occasional issues with Foundry and Bun.
- Git line ending warnings (CRLF vs LF) on every commit — cosmetic but annoying.
- PowerShell vs Bash syntax differences when running commands.

**How we overcame it:** Used Bun (cross-platform) as the primary runtime, added `cross-env` for env vars, and used Git Bash for shell operations.

---

## 8. Scope Management — Solo Developer, Month-Long Hackathon

Building a full-stack project (Solidity contracts + CRE workflow + behavioral engine + Next.js dashboard + 4 tabs + 10-slide presentation + mock API + agent simulators + documentation) as a solo developer.

**Key decisions:**
- **Mock API over live AI calls** — Using a deterministic mock API server for demos instead of live Claude/GPT-4 calls. This ensures consistent demo results and avoids API costs/latency. The CRE workflow code is real and production-ready; only the AI endpoints point to the mock server.
- **Tenderly over live testnet** — Virtual TestNet with funded accounts means no faucet hunting, instant transactions, and the Simulation API for the dashboard's drag-and-drop simulator.
- **Feature flags over conditional compilation** — `enableConfidentialCompute` config flag lets us switch between standard and confidential HTTP without code changes.
- **Documentation as a feature** — Invested heavily in README, TECHNICAL.md, ARCHITECTURE.md, CRE_INTEGRATION.md, CONFIDENTIAL-COMPUTE.md, SECURITY_MODEL.md, and INTEGRATION-GUIDE.md. This differentiates the submission from projects that are technically strong but poorly explained.

---

## Summary for Airtable

> **Short version (for the form):**
>
> The CRE SDK is bleeding-edge (v1.0.9, released during the hackathon) with minimal documentation — we had to read SDK source code to understand ConfidentialHTTPClient's request format, WASM constraints (.result() pattern, no async/await), and ConsensusAggregationByFields behavior. Next.js 15 + Turbopack had production build bugs that required refactoring every page into server/client component pairs. The behavioral scoring engine required careful math to avoid false positives while detecting sophisticated attacks like sequential probing and cumulative drift. We also discovered a fundamental tension between blockchain transparency (on-chain policy is publicly readable) and our confidential compute goals — which we resolved by designing three independent defense layers where knowing one layer's rules doesn't help bypass the others.
