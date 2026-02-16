# SentinelCRE — Submission Checklist & Battle Plan

## 14-Day Battle Plan (Feb 16 — Mar 1)

---

### Day 1: Feb 16 (Sunday) — CC SDK Access + Scaffold

**Morning:**
- [ ] Sign up for CC Early Access at cre.chain.link
- [ ] Download and explore Confidential HTTP SDK docs
- [ ] Note any syntax differences from what we assumed
- [ ] Update the build prompt if CC API is different

**Afternoon:**
- [ ] Paste Part 1 of the build prompt into Claude Code CLI
- [ ] Scaffold full project structure
- [ ] `bun install` in sentinel-workflow/
- [ ] `forge init` in contracts/
- [ ] Install OpenZeppelin: `forge install OpenZeppelin/openzeppelin-contracts`
- [ ] Verify skeleton compiles

**Evening:**
- [ ] First git commit: "Initial scaffold"

---

### Day 2: Feb 17 (Monday) — Smart Contract

**Morning:**
- [ ] Write SentinelGuardian.sol (use the spec from build prompt)
- [ ] `forge build` — fix any compilation errors

**Afternoon:**
- [ ] Write SentinelGuardian.t.sol (use the test file provided)
- [ ] `forge test` — all tests must pass
- [ ] Fix any edge cases found during testing

**Evening:**
- [ ] Git commit: "SentinelGuardian.sol with full test suite"

---

### Day 3: Feb 18 (Tuesday) — Type Definitions + Mock Server

**Morning:**
- [ ] Create all type definition files (actions.ts, policy.ts, verdict.ts, behavioral.ts)
- [ ] Verify they compile with `tsc --noEmit`

**Afternoon:**
- [ ] Build mock-ai-server.ts
  - Accepts POST /evaluate
  - Returns deterministic verdicts based on action characteristics
  - Normal actions → APPROVED, rogue actions → DENIED
  - Match exact JSON schema of Claude API response
- [ ] Test mock server independently

**Evening:**
- [ ] Git commit: "Types + mock AI server"

---

### Day 4: Feb 19 (Wednesday) — CRE Workflow (Core)

**This is the most important day. Block 6+ hours.**

**Morning:**
- [ ] Start main.ts — HTTP trigger + callback skeleton
- [ ] Implement Step 1: Parse & validate proposed action
- [ ] Implement Step 2: Retrieve agent policy from secrets
- [ ] Implement Step 3: Policy pre-check (evaluatePolicy function)
- [ ] Run `cre workflow simulate` after each step — catch errors early

**Afternoon:**
- [ ] Implement Step 4: Behavioral analysis (analyzeBehavior function)
  - All 6 anomaly dimensions
  - Pay special attention to sequential probing detection
- [ ] Run simulation with normal action fixture → should PASS all checks

**Evening:**
- [ ] Implement Step 5: Multi-AI consensus (runInNodeMode pattern)
  - Point at mock-ai-server.ts for simulation
  - Use consensusIdenticalAggregation
- [ ] Run simulation end-to-end → verify APPROVED verdict
- [ ] Git commit: "Core CRE workflow — verdict pipeline"

---

### Day 5: Feb 20 (Thursday) — CRE Workflow (On-Chain Write + Denial Path)

**Morning:**
- [ ] Implement Step 6: Aggregate final verdict
- [ ] Implement Step 7: EVMClient writeReport to SentinelGuardian.sol
- [ ] Deploy SentinelGuardian to Sepolia via `forge script`
- [ ] Update config.staging.json with deployed address

**Afternoon:**
- [ ] Implement the DENIAL path — circuit breaker flow
- [ ] Add error handling: every error → DEFAULT DENY
- [ ] Simulate with rogue action fixture → verify DENIED + circuit breaker

**Evening:**
- [ ] Build normal-agent.ts simulator script
- [ ] Build rogue-agent.ts simulator script (both scenarios: drain + probe)
- [ ] Run full demo via run-demo.sh
- [ ] Git commit: "Full workflow with on-chain writes and circuit breaker"

---

### Day 6: Feb 21 (Friday) — Confidential Compute Integration

**Morning:**
- [ ] Check CC SDK docs (should be accessible by now)
- [ ] Identify exact ConfidentialHTTPClient API syntax
- [ ] Add feature flag: `enableConfidentialCompute` in config

**Afternoon:**
- [ ] Replace standard HTTP calls with Confidential HTTP where available
- [ ] If CC API differs from expected: adapt code, keep standard as fallback
- [ ] Add `[CONFIDENTIAL_COMPUTE]` markers throughout the code
- [ ] Test simulation with CC enabled

**Evening:**
- [ ] If CC simulation works → great, full integration
- [ ] If CC has issues → fall back to standard + document the upgrade path
- [ ] Git commit: "Confidential Compute integration"

---

### Day 7: Feb 22 (Saturday) — Tenderly Deployment + End-to-End Testing

**Morning:**
- [ ] Set up Tenderly Virtual TestNet (fork Sepolia)
- [ ] Deploy SentinelGuardian.sol to Tenderly
- [ ] Deploy CRE workflow targeting Tenderly chain

**Afternoon:**
- [ ] Run full demo against Tenderly:
  - 3 normal trades → all approved
  - 1 rogue drain attempt → denied + circuit breaker
  - 1 probing sequence → caught at step 3
- [ ] Verify all events on Tenderly explorer
- [ ] Screenshot/record key Tenderly screens for documentation

**Evening:**
- [ ] Fix any issues found during E2E testing
- [ ] Git commit: "Tenderly deployment + E2E validation"

---

### Day 8: Feb 23 (Sunday) — Documentation Sprint

**Morning:**
- [ ] Write README.md (hackathon-ready, with Mermaid diagrams)
  - Use ARCHITECTURE.md content as source
  - Include quick start, demo video placeholder, ecosystem fit
- [ ] Write SECURITY-MODEL.md (use edge case content from Part 3)

**Afternoon:**
- [ ] Write CONFIDENTIAL-COMPUTE.md
- [ ] Write ARCHITECTURE.md (finalize Mermaid diagrams)
- [ ] Add comprehensive inline code comments to main.ts

**Evening:**
- [ ] Proofread all documentation
- [ ] Git commit: "Complete documentation suite"

---

### Day 9: Feb 24 (Monday) — Demo Video Prep

**Morning:**
- [ ] Print and rehearse demo script (Part 2) — read aloud 3 times
- [ ] Set up screen recording software (OBS or similar)
- [ ] Set up terminal theme (dark, clean, large font)
- [ ] Prepare all terminal commands in a cheat sheet

**Afternoon:**
- [ ] Do a full dry run recording (no editing, just practice)
- [ ] Identify timing issues — where are you rushing, where does it drag
- [ ] Adjust script if any sections are too long

**Evening:**
- [ ] Prepare simple animations/graphics (optional):
  - SentinelCRE logo (even just text)
  - TEE "black box" diagram
  - Simple title cards for section transitions

---

### Day 10: Feb 25 (Tuesday) — Record Demo Video

**Morning:**
- [ ] Final rehearsal
- [ ] Record demo video — aim for 2-3 clean takes
- [ ] Include real Tenderly explorer showing events

**Afternoon:**
- [ ] Basic editing:
  - Cut dead air
  - Add title cards between sections
  - Add text overlay for key points
  - Ensure audio is clear
- [ ] Export at 1080p

**Evening:**
- [ ] Watch the video critically — would you fund this project?
- [ ] If anything feels weak, re-record that section
- [ ] Upload to YouTube (unlisted) or preferred platform

---

### Day 11: Feb 26 (Wednesday) — Polish & Edge Cases

**Morning:**
- [ ] Code review: read every file with fresh eyes
- [ ] Look for TODO comments that need resolving
- [ ] Ensure all error paths default to DENY
- [ ] Run `forge test` one more time

**Afternoon:**
- [ ] Clean up any commented-out code
- [ ] Ensure .gitignore is comprehensive
- [ ] Remove any debugging logs from production code
- [ ] Final `cre workflow simulate` test

**Evening:**
- [ ] Git commit: "Final polish"
- [ ] Tag release: `git tag v1.0.0-convergence-2026`

---

### Day 12: Feb 27 (Thursday) — Submission Prep

**Morning:**
- [ ] Create GitHub repo (if not already)
- [ ] Push all code to main branch
- [ ] Verify README renders correctly on GitHub
- [ ] Verify all Mermaid diagrams render

**Afternoon:**
- [ ] Fill out Devpost / hackathon submission form
- [ ] Write submission description (3-5 paragraphs)
- [ ] Select tracks: CRE & AI, Privacy, Risk & Compliance
- [ ] Add demo video link
- [ ] Add GitHub repo link

**Evening:**
- [ ] Review submission — have someone else read it if possible
- [ ] Save draft but DON'T submit yet

---

### Day 13: Feb 28 (Friday) — Buffer Day

**Morning:**
- [ ] Fix anything that came up
- [ ] If everything is clean, spend time improving demo video quality
- [ ] Add any last refinements to documentation

**Afternoon:**
- [ ] Final round of testing
- [ ] Verify demo video is accessible (test link in incognito)
- [ ] Verify GitHub repo is public and clean

**Evening:**
- [ ] Prepare for submission day

---

### Day 14: Mar 1 (Saturday) — SUBMISSION DAY

**Morning:**
- [ ] Final review of submission form
- [ ] Verify all links work (GitHub, video, live demo if applicable)
- [ ] Submit to hackathon

**SUBMIT EARLY IN THE DAY — don't wait until the deadline.**

---

## Submission Checklist

### Required
- [ ] GitHub repository (public, clean, well-documented)
- [ ] Demo video (3-5 minutes, shows working product)
- [ ] README with architecture, quick start, and CRE usage documentation
- [ ] Hackathon submission form completed
- [ ] Tracks selected: CRE & AI, Privacy, Risk & Compliance

### Strongly Recommended
- [ ] Deployed smart contract on Sepolia (Tenderly or direct)
- [ ] Working CRE workflow simulation
- [ ] Comprehensive test suite (Foundry)
- [ ] Security model documentation
- [ ] Confidential Compute integration (even if partial)

### Nice to Have
- [ ] Tenderly Virtual TestNet with verifiable events
- [ ] Multiple attack scenarios demonstrated
- [ ] Ecosystem positioning (mention Coinbase x402, Aave, Ondo)
- [ ] Clean git history with meaningful commit messages
- [ ] License file (MIT)

---

## Judging Criteria (What We Know)

Based on typical Chainlink hackathon scoring:

1. **Technical Execution** (30%) — Does it work? Is the code clean? Are CRE capabilities used correctly?
2. **Innovation** (25%) — Is the idea novel? Does it solve a real problem?
3. **Use of Sponsor Technology** (25%) — How deeply is CRE integrated? Is it the backbone or just a wrapper?
4. **Presentation** (20%) — Is the demo video compelling? Is the README clear?

### How SentinelCRE Scores

| Criterion | Expected Score | Why |
|-----------|---------------|-----|
| Technical Execution | 8-9/10 | Working CRE workflow + deployed contract + full test suite |
| Innovation | 9/10 | AI guardrails with invisible thresholds via CC — nobody else is doing this |
| Use of CRE | 9/10 | CRE IS the product — HTTP trigger, HTTPClient, EVMClient, Confidential HTTP, Secrets, Consensus |
| Presentation | 8-9/10 | Cinematic demo with rogue agent + probing attack + Tenderly proof |

**Biggest risk**: Technical execution. If the CRE workflow doesn't simulate cleanly or the CC integration has SDK issues, the score drops. That's why the standard implementation is the backup — always have a working demo.

---

## Emergency Fallback Plan

If things go wrong:

**CC SDK doesn't work as expected**: Ship with standard `runInNodeMode` + secrets. Document CC upgrade path in CONFIDENTIAL-COMPUTE.md. The architecture shows where CC plugs in — judges understand Early Access limitations.

**CRE workflow won't simulate**: Check the CRE Discord and docs for breaking changes. Strip complexity until it simulates. A simple version of the workflow that works is infinitely better than a complex version that doesn't.

**Smart contract has issues**: SentinelGuardian is straightforward Solidity. If Foundry tests pass, it works. Deploy to Sepolia directly (not Tenderly) if Tenderly has issues.

**Running out of time**: Prioritize in this order:
1. Working CRE workflow simulation (non-negotiable)
2. Deployed smart contract on Sepolia
3. Demo video
4. README
5. Everything else
