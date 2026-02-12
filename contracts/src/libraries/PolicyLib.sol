// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @notice Policy configuration for an AI agent registered with SentinelGuardian
struct AgentPolicy {
    uint256 maxTransactionValue; // Max value per single tx (wei)
    uint256 maxDailyVolume; // Max cumulative value per day (wei)
    uint256 maxMintAmount; // Max mint amount per tx (token units) — prevents infinite mint
    uint256 rateLimit; // Max actions per window
    uint256 rateLimitWindow; // Window duration in seconds
    address[] approvedContracts; // Whitelist of allowed target contracts
    bytes4[] blockedFunctions; // Blacklist of forbidden function selectors
    bool requireMultiAIConsensus; // Whether multi-AI evaluation is required
    bool isActive; // Whether this policy is enabled
}

/// @notice Parameters for a full policy check
struct CheckParams {
    address target;
    bytes4 funcSig;
    uint256 value;
    uint256 mintAmount;
    uint256 actionCount;
    uint256 windowStart;
    uint256 currentTime;
}

/// @title PolicyLib — Pure policy validation logic for SentinelGuardian
library PolicyLib {
    /// @notice Check if transaction value is within the agent's limit
    function checkValue(
        AgentPolicy storage policy,
        uint256 value
    ) internal view returns (bool, string memory) {
        if (value > policy.maxTransactionValue) {
            return (false, "Value exceeds max transaction limit");
        }
        return (true, "");
    }

    /// @notice Check if target contract is on the agent's whitelist
    function checkTarget(
        AgentPolicy storage policy,
        address target
    ) internal view returns (bool, string memory) {
        if (policy.approvedContracts.length == 0) {
            return (true, ""); // No whitelist = all allowed
        }
        for (uint256 i = 0; i < policy.approvedContracts.length; i++) {
            if (policy.approvedContracts[i] == target) {
                return (true, "");
            }
        }
        return (false, "Target contract not approved");
    }

    /// @notice Check if function selector is blocked
    function checkFunction(
        AgentPolicy storage policy,
        bytes4 funcSig
    ) internal view returns (bool, string memory) {
        for (uint256 i = 0; i < policy.blockedFunctions.length; i++) {
            if (policy.blockedFunctions[i] == funcSig) {
                return (false, "Function signature is blocked");
            }
        }
        return (true, "");
    }

    /// @notice Check if agent has exceeded its rate limit within the current window
    function checkRateLimit(
        AgentPolicy storage policy,
        uint256 actionCount,
        uint256 windowStart,
        uint256 currentTime
    ) internal view returns (bool, string memory) {
        if (policy.rateLimit == 0) {
            return (true, ""); // No rate limit configured
        }
        // If window has expired, the count will be reset — passes
        if (currentTime >= windowStart + policy.rateLimitWindow) {
            return (true, "");
        }
        if (actionCount >= policy.rateLimit) {
            return (false, "Rate limit exceeded");
        }
        return (true, "");
    }

    /// @notice Check if mint amount is within the agent's cap
    function checkMintAmount(
        AgentPolicy storage policy,
        uint256 mintAmount
    ) internal view returns (bool, string memory) {
        if (policy.maxMintAmount == 0) {
            return (true, ""); // No mint cap configured
        }
        if (mintAmount > policy.maxMintAmount) {
            return (false, "Mint amount exceeds cap");
        }
        return (true, "");
    }

    /// @notice Run all policy checks in sequence. Returns on first failure.
    function checkAll(
        AgentPolicy storage policy,
        CheckParams memory p
    ) internal view returns (bool, string memory) {
        (bool passed, string memory reason) = checkValue(policy, p.value);
        if (!passed) return (false, reason);

        (passed, reason) = checkTarget(policy, p.target);
        if (!passed) return (false, reason);

        (passed, reason) = checkFunction(policy, p.funcSig);
        if (!passed) return (false, reason);

        (passed, reason) = checkRateLimit(policy, p.actionCount, p.windowStart, p.currentTime);
        if (!passed) return (false, reason);

        (passed, reason) = checkMintAmount(policy, p.mintAmount);
        if (!passed) return (false, reason);

        return (true, "");
    }
}
