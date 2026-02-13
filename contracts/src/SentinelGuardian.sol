// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {AgentPolicy, CheckParams, PolicyLib} from "./libraries/PolicyLib.sol";
import {Severity, ChallengeStatus, ChallengeWindow} from "./interfaces/IChallenge.sol";

/// @notice State of a registered AI agent
enum AgentState {
    Active,
    Frozen,
    Revoked
}

/// @notice Classification of security incidents
enum IncidentType {
    PolicyViolation,
    ConsensusFailure,
    RateLimit,
    AnomalyDetected,
    ManualFreeze
}

/// @notice Immutable record of a blocked action
struct IncidentLog {
    uint64 timestamp;
    bytes32 agentId;
    IncidentType incidentType;
    string reason;
    address targetContract;
    uint256 attemptedValue;
}

/// @title SentinelGuardian — AI agent guardian with policy enforcement and circuit breakers
/// @notice Receives verdicts from CRE workflows and either approves or blocks agent actions
contract SentinelGuardian is AccessControl, Pausable {
    using PolicyLib for AgentPolicy;

    // =========================================================================
    // Roles
    // =========================================================================

    bytes32 public constant WORKFLOW_ROLE = keccak256("WORKFLOW_ROLE");
    bytes32 public constant CHALLENGER_ROLE = keccak256("CHALLENGER_ROLE");

    // =========================================================================
    // State
    // =========================================================================

    mapping(bytes32 => AgentPolicy) internal _agentPolicies;
    mapping(bytes32 => AgentState) public agentStates;
    mapping(bytes32 => bool) public agentExists;

    // Rate limiting
    mapping(bytes32 => uint256) public actionCounts;
    mapping(bytes32 => uint256) public windowStartTimes;

    // Daily volume tracking
    mapping(bytes32 => uint256) public dailyVolume;
    mapping(bytes32 => uint256) public dailyVolumeWindowStart;

    // Incident history (circular buffer)
    mapping(bytes32 => IncidentLog[]) internal _incidents;
    mapping(bytes32 => uint256) internal _incidentHead; // next write index
    uint256 public constant MAX_INCIDENT_HISTORY = 100;

    // Cumulative mint tracking (for Proof of Reserves)
    mapping(bytes32 => uint256) public cumulativeMints;

    // Challenge windows (time-gapped appeal mechanism)
    mapping(bytes32 => ChallengeWindow) internal _challenges;
    uint256 public constant LOW_WINDOW = 3600;    // 1 hour
    uint256 public constant MEDIUM_WINDOW = 1800; // 30 minutes

    // Stats
    mapping(bytes32 => uint256) public totalApproved;
    mapping(bytes32 => uint256) public totalDenied;

    // =========================================================================
    // Events
    // =========================================================================

    event ActionApproved(
        bytes32 indexed agentId, address target, uint256 value, uint256 timestamp
    );
    event ActionDenied(
        bytes32 indexed agentId, address target, uint256 value, string reason, uint256 timestamp
    );
    event CircuitBreakerTriggered(
        bytes32 indexed agentId, string reason, IncidentType incidentType, uint256 timestamp
    );
    event AgentRegistered(bytes32 indexed agentId, uint256 timestamp);
    event AgentFrozen(bytes32 indexed agentId, uint256 timestamp);
    event AgentUnfrozen(bytes32 indexed agentId, uint256 timestamp);
    event AgentRevoked(bytes32 indexed agentId, uint256 timestamp);
    event PolicyUpdated(bytes32 indexed agentId, uint256 timestamp);
    event ChallengeCreated(bytes32 indexed agentId, Severity severity, uint64 expiresAt);
    event ChallengeAppealed(bytes32 indexed agentId, uint256 timestamp);
    event ChallengeResolved(bytes32 indexed agentId, ChallengeStatus result, uint256 timestamp);

    // =========================================================================
    // Constructor
    // =========================================================================

    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    // =========================================================================
    // CRE Verdict Receiver
    // =========================================================================

    /// @notice Process a verdict from the CRE sentinel workflow
    /// @param reportData ABI-encoded verdict:
    ///   (bytes32 agentId, bool approved, string reason, address target,
    ///    bytes4 targetFunction, uint256 value, uint256 mintAmount)
    function processVerdict(bytes calldata reportData)
        external
        onlyRole(WORKFLOW_ROLE)
        whenNotPaused
    {
        (
            bytes32 agentId,
            bool approved,
            string memory reason,
            address targetContract,
            bytes4 targetFunction,
            uint256 value,
            uint256 mintAmount
        ) = abi.decode(reportData, (bytes32, bool, string, address, bytes4, uint256, uint256));

        require(agentExists[agentId], "Agent not registered");
        require(agentStates[agentId] == AgentState.Active, "Agent not active");

        if (approved) {
            // Run on-chain policy validation as a second layer
            AgentPolicy storage policy = _agentPolicies[agentId];
            CheckParams memory params = CheckParams({
                target: targetContract,
                funcSig: targetFunction,
                value: value,
                mintAmount: mintAmount,
                actionCount: actionCounts[agentId],
                windowStart: windowStartTimes[agentId],
                currentTime: block.timestamp,
                cumulativeMints: cumulativeMints[agentId],
                dailyVolume: dailyVolume[agentId]
            });
            (bool policyPassed, string memory policyReason) = policy.checkAll(params);

            if (!policyPassed) {
                // AI approved but policy rejected — circuit breaker
                _triggerCircuitBreaker(
                    agentId, policyReason, targetContract, value, IncidentType.PolicyViolation
                );
                return;
            }

            _recordApprovedAction(agentId, value, mintAmount);
            emit ActionApproved(agentId, targetContract, value, block.timestamp);
        } else {
            _triggerCircuitBreaker(
                agentId, reason, targetContract, value, IncidentType.ConsensusFailure
            );
        }
    }

    // =========================================================================
    // Agent Management
    // =========================================================================

    /// @notice Register a new AI agent with a policy
    function registerAgent(bytes32 agentId, AgentPolicy calldata policy)
        external
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        require(!agentExists[agentId], "Agent already registered");
        require(policy.isActive, "Policy must be active");

        _setPolicy(agentId, policy);
        agentStates[agentId] = AgentState.Active;
        agentExists[agentId] = true;

        emit AgentRegistered(agentId, block.timestamp);
    }

    /// @notice Update an existing agent's policy
    function updatePolicy(bytes32 agentId, AgentPolicy calldata policy)
        external
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        require(agentExists[agentId], "Agent not registered");

        _setPolicy(agentId, policy);
        emit PolicyUpdated(agentId, block.timestamp);
    }

    /// @notice Freeze an agent — callable by workflow (automated) or admin
    function freezeAgent(bytes32 agentId) external {
        require(
            hasRole(WORKFLOW_ROLE, msg.sender) || hasRole(DEFAULT_ADMIN_ROLE, msg.sender),
            "Not authorized to freeze"
        );
        require(agentExists[agentId], "Agent not registered");
        require(agentStates[agentId] == AgentState.Active, "Agent not active");

        agentStates[agentId] = AgentState.Frozen;
        emit AgentFrozen(agentId, block.timestamp);

        if (hasRole(DEFAULT_ADMIN_ROLE, msg.sender)) {
            _logIncident(
                agentId, "Manual freeze by admin", address(0), 0, IncidentType.ManualFreeze
            );
        }
    }

    /// @notice Unfreeze an agent — admin only
    function unfreezeAgent(bytes32 agentId) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(agentExists[agentId], "Agent not registered");
        require(agentStates[agentId] == AgentState.Frozen, "Agent not frozen");

        agentStates[agentId] = AgentState.Active;
        emit AgentUnfrozen(agentId, block.timestamp);
    }

    /// @notice Permanently revoke an agent — cannot be unfrozen
    function revokeAgent(bytes32 agentId) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(agentExists[agentId], "Agent not registered");
        require(agentStates[agentId] != AgentState.Revoked, "Already revoked");

        agentStates[agentId] = AgentState.Revoked;
        emit AgentRevoked(agentId, block.timestamp);
    }

    // =========================================================================
    // Pause
    // =========================================================================

    function pause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _unpause();
    }

    // =========================================================================
    // Challenge Window (Time-Gapped Appeal)
    // =========================================================================

    /// @notice Agent owner appeals a denied action during the challenge window
    function challengeVerdict(bytes32 agentId) external {
        require(
            hasRole(CHALLENGER_ROLE, msg.sender) || hasRole(DEFAULT_ADMIN_ROLE, msg.sender),
            "Not authorized to challenge"
        );
        ChallengeWindow storage cw = _challenges[agentId];
        require(cw.status == ChallengeStatus.Pending, "No pending challenge");
        require(block.timestamp < cw.expiresAt, "Challenge window expired");

        cw.status = ChallengeStatus.Appealed;
        emit ChallengeAppealed(agentId, block.timestamp);
    }

    /// @notice CRE workflow callback after appeal re-evaluation
    function resolveChallenge(bytes32 agentId, bool approved, string calldata reason)
        external
        onlyRole(WORKFLOW_ROLE)
    {
        ChallengeWindow storage cw = _challenges[agentId];
        require(cw.status == ChallengeStatus.Appealed, "Not in appealed state");

        if (approved) {
            cw.status = ChallengeStatus.Overturned;
            agentStates[agentId] = AgentState.Active;
            emit ChallengeResolved(agentId, ChallengeStatus.Overturned, block.timestamp);
        } else {
            cw.status = ChallengeStatus.Upheld;
            emit ChallengeResolved(agentId, ChallengeStatus.Upheld, block.timestamp);
        }
    }

    /// @notice Finalize expired challenges — can be called by anyone (Automation-ready)
    function finalizeExpiredChallenge(bytes32 agentId) external {
        ChallengeWindow storage cw = _challenges[agentId];
        require(cw.status == ChallengeStatus.Pending, "Not pending");
        require(block.timestamp >= cw.expiresAt, "Window not expired");

        cw.status = ChallengeStatus.Expired;
        emit ChallengeResolved(agentId, ChallengeStatus.Expired, block.timestamp);
    }

    // =========================================================================
    // View Functions
    // =========================================================================

    function getAgentPolicy(bytes32 agentId)
        external
        view
        returns (
            uint256 maxTransactionValue,
            uint256 maxDailyVolume,
            uint256 maxMintAmount,
            uint256 rateLimit,
            uint256 rateLimitWindow,
            bool requireMultiAiConsensus,
            bool isActive,
            address reserveFeed,
            uint256 minReserveRatio,
            uint256 maxStaleness
        )
    {
        AgentPolicy storage p = _agentPolicies[agentId];
        return (
            p.maxTransactionValue,
            p.maxDailyVolume,
            p.maxMintAmount,
            p.rateLimit,
            p.rateLimitWindow,
            p.requireMultiAiConsensus,
            p.isActive,
            p.reserveFeed,
            p.minReserveRatio,
            p.maxStaleness
        );
    }

    function getApprovedContracts(bytes32 agentId) external view returns (address[] memory) {
        return _agentPolicies[agentId].approvedContracts;
    }

    function getBlockedFunctions(bytes32 agentId) external view returns (bytes4[] memory) {
        return _agentPolicies[agentId].blockedFunctions;
    }

    function getAgentState(bytes32 agentId) external view returns (AgentState) {
        return agentStates[agentId];
    }

    function isAgentActive(bytes32 agentId) external view returns (bool) {
        return agentExists[agentId] && agentStates[agentId] == AgentState.Active;
    }

    function getIncidentCount(bytes32 agentId) external view returns (uint256) {
        return _incidents[agentId].length;
    }

    function getIncident(bytes32 agentId, uint256 index) external view returns (IncidentLog memory) {
        require(index < _incidents[agentId].length, "Index out of bounds");
        return _incidents[agentId][index];
    }

    function getActionStats(bytes32 agentId)
        external
        view
        returns (uint256 approved, uint256 denied, uint256 currentWindowActions, uint256 currentDailyVolume)
    {
        return (totalApproved[agentId], totalDenied[agentId], actionCounts[agentId], dailyVolume[agentId]);
    }

    function getChallenge(bytes32 agentId) external view returns (ChallengeWindow memory) {
        return _challenges[agentId];
    }

    // =========================================================================
    // Internal
    // =========================================================================

    function _triggerCircuitBreaker(
        bytes32 agentId,
        string memory reason,
        address target,
        uint256 value,
        IncidentType iType
    ) internal {
        Severity sev = _classifySeverity(agentId, iType, value);

        agentStates[agentId] = AgentState.Frozen;
        totalDenied[agentId]++;
        _logIncident(agentId, reason, target, value, iType);

        emit ActionDenied(agentId, target, value, reason, block.timestamp);
        emit CircuitBreakerTriggered(agentId, reason, iType, block.timestamp);
        emit AgentFrozen(agentId, block.timestamp);

        if (sev != Severity.Critical) {
            // Create challenge window — agent can appeal
            uint256 duration = sev == Severity.Low ? LOW_WINDOW : MEDIUM_WINDOW;
            _challenges[agentId] = ChallengeWindow({
                agentId: agentId,
                createdAt: uint64(block.timestamp),
                expiresAt: uint64(block.timestamp + duration),
                status: ChallengeStatus.Pending,
                severity: sev,
                originalVerdictData: "",
                reason: reason
            });
            emit ChallengeCreated(agentId, sev, uint64(block.timestamp + duration));
        }
    }

    function _classifySeverity(
        bytes32 agentId,
        IncidentType iType,
        uint256 value
    ) internal view returns (Severity) {
        AgentPolicy storage policy = _agentPolicies[agentId];

        // Critical: value > 10x limit or any blocked function violation
        if (iType == IncidentType.PolicyViolation) {
            if (policy.maxTransactionValue > 0 && value > policy.maxTransactionValue * 10) {
                return Severity.Critical;
            }
        }

        // Medium: consensus failure with elevated value
        if (iType == IncidentType.ConsensusFailure) {
            if (policy.maxTransactionValue > 0 && value > policy.maxTransactionValue * 2) {
                return Severity.Medium;
            }
            return Severity.Low;
        }

        // Low: minor policy violations
        return Severity.Low;
    }

    function _logIncident(
        bytes32 agentId,
        string memory reason,
        address target,
        uint256 value,
        IncidentType iType
    ) internal {
        IncidentLog memory log = IncidentLog({
            timestamp: uint64(block.timestamp),
            agentId: agentId,
            incidentType: iType,
            reason: reason,
            targetContract: target,
            attemptedValue: value
        });

        if (_incidents[agentId].length < MAX_INCIDENT_HISTORY) {
            _incidents[agentId].push(log);
        } else {
            // Circular buffer: overwrite oldest entry in O(1)
            _incidents[agentId][_incidentHead[agentId]] = log;
            _incidentHead[agentId] = (_incidentHead[agentId] + 1) % MAX_INCIDENT_HISTORY;
        }
    }

    function _recordApprovedAction(bytes32 agentId, uint256 value, uint256 mintAmount) internal {
        totalApproved[agentId]++;

        // Track cumulative mints for Proof of Reserves
        if (mintAmount > 0) {
            cumulativeMints[agentId] += mintAmount;
        }

        // Rate limit window management
        AgentPolicy storage policy = _agentPolicies[agentId];
        if (
            policy.rateLimitWindow > 0
                && block.timestamp >= windowStartTimes[agentId] + policy.rateLimitWindow
        ) {
            // Window expired — reset
            actionCounts[agentId] = 1;
            windowStartTimes[agentId] = block.timestamp;
        } else {
            if (windowStartTimes[agentId] == 0) {
                windowStartTimes[agentId] = block.timestamp;
            }
            actionCounts[agentId]++;
        }

        // Daily volume tracking (86400 = 1 day)
        if (block.timestamp >= dailyVolumeWindowStart[agentId] + 86400) {
            dailyVolume[agentId] = value;
            dailyVolumeWindowStart[agentId] = block.timestamp;
        } else {
            if (dailyVolumeWindowStart[agentId] == 0) {
                dailyVolumeWindowStart[agentId] = block.timestamp;
            }
            dailyVolume[agentId] += value;
        }
    }

    function _setPolicy(bytes32 agentId, AgentPolicy calldata policy) internal {
        AgentPolicy storage stored = _agentPolicies[agentId];
        stored.maxTransactionValue = policy.maxTransactionValue;
        stored.maxDailyVolume = policy.maxDailyVolume;
        stored.maxMintAmount = policy.maxMintAmount;
        stored.rateLimit = policy.rateLimit;
        stored.rateLimitWindow = policy.rateLimitWindow;
        stored.requireMultiAiConsensus = policy.requireMultiAiConsensus;
        stored.isActive = policy.isActive;
        stored.reserveFeed = policy.reserveFeed;
        stored.minReserveRatio = policy.minReserveRatio;
        stored.maxStaleness = policy.maxStaleness;

        // Copy dynamic arrays
        delete stored.approvedContracts;
        for (uint256 i = 0; i < policy.approvedContracts.length; i++) {
            stored.approvedContracts.push(policy.approvedContracts[i]);
        }
        delete stored.blockedFunctions;
        for (uint256 i = 0; i < policy.blockedFunctions.length; i++) {
            stored.blockedFunctions.push(policy.blockedFunctions[i]);
        }
    }
}
