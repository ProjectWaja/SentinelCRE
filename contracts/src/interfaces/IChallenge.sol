// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

/// @notice Severity classification for denied actions
enum Severity {
    Low,      // Challenge allowed — 1 hour window
    Medium,   // Challenge allowed — 30 minute window
    Critical  // Instant freeze, no appeal
}

/// @notice Status of a challenge window
enum ChallengeStatus {
    None,        // No active challenge
    Pending,     // Challenge window open, awaiting appeal
    Appealed,    // Appeal submitted, awaiting CRE re-evaluation
    Upheld,      // Denial confirmed after re-evaluation
    Overturned,  // Denial reversed — action approved
    Expired      // Window expired without appeal
}

/// @notice A time-gapped challenge window for denied actions
struct ChallengeWindow {
    bytes32 agentId;
    uint64 createdAt;
    uint64 expiresAt;
    ChallengeStatus status;
    Severity severity;
    bytes originalVerdictData;
    string reason;
}
