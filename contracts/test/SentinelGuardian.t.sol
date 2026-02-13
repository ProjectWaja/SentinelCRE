// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";
import {SentinelGuardian, AgentState, IncidentType, IncidentLog} from "../src/SentinelGuardian.sol";
import {AgentPolicy} from "../src/libraries/PolicyLib.sol";

contract SentinelGuardianTest is Test {
    SentinelGuardian public guardian;

    address public admin = address(this);
    address public workflow = address(0xC5E1);
    address public stranger = address(0xDEAD);
    address public approvedDex = address(0xAA01);
    address public unapprovedContract = address(0xBB01);

    bytes4 public blockedSig = bytes4(0xff00ff00);
    bytes4 public normalSig = bytes4(0x38ed1739); // swapExactTokensForTokens

    bytes32 public agentId =
        bytes32(uint256(0x53656E74696E656C4167656E74303100000000000000000000000000000001));

    bytes32 public agentId2 =
        bytes32(uint256(0x53656E74696E656C4167656E74303200000000000000000000000000000002));

    function _buildPolicy() internal view returns (AgentPolicy memory) {
        address[] memory approved = new address[](1);
        approved[0] = approvedDex;
        bytes4[] memory blocked = new bytes4[](1);
        blocked[0] = blockedSig;

        return AgentPolicy({
            maxTransactionValue: 1 ether,
            maxDailyVolume: 10 ether,
            maxMintAmount: 1_000_000e18,
            rateLimit: 5,
            rateLimitWindow: 60,
            approvedContracts: approved,
            blockedFunctions: blocked,
            requireMultiAiConsensus: true,
            isActive: true,
            reserveFeed: address(0),
            minReserveRatio: 0,
            maxStaleness: 0
        });
    }

    function _buildVerdict(
        bytes32 _agentId,
        bool approved,
        string memory reason,
        address target,
        bytes4 funcSig,
        uint256 value,
        uint256 mintAmount
    ) internal pure returns (bytes memory) {
        return abi.encode(_agentId, approved, reason, target, funcSig, value, mintAmount);
    }

    function setUp() public {
        // Foundry block.timestamp starts at 1 — warp forward
        vm.warp(1000);

        guardian = new SentinelGuardian();
        guardian.grantRole(guardian.WORKFLOW_ROLE(), workflow);
        guardian.registerAgent(agentId, _buildPolicy());
    }

    // =========================================================================
    // Registration
    // =========================================================================

    function testRegisterAgent() public view {
        (
            uint256 maxTx,
            uint256 maxDaily,
            uint256 maxMint,
            uint256 rl,
            uint256 window,
            bool requireAi,
            bool isActive,
            address reserveFeed,
            uint256 minReserveRatio,
            uint256 maxStaleness
        ) = guardian.getAgentPolicy(agentId);

        assertEq(maxTx, 1 ether);
        assertEq(maxDaily, 10 ether);
        assertEq(maxMint, 1_000_000e18);
        assertEq(rl, 5);
        assertEq(window, 60);
        assertTrue(requireAi);
        assertTrue(isActive);
        assertEq(reserveFeed, address(0));
        assertEq(minReserveRatio, 0);
        assertEq(maxStaleness, 0);
    }

    function testRegisterAgentApprovedContracts() public view {
        address[] memory approved = guardian.getApprovedContracts(agentId);
        assertEq(approved.length, 1);
        assertEq(approved[0], approvedDex);
    }

    function testRegisterAgentBlockedFunctions() public view {
        bytes4[] memory blocked = guardian.getBlockedFunctions(agentId);
        assertEq(blocked.length, 1);
        assertEq(blocked[0], blockedSig);
    }

    function testRegisterAgentOnlyAdmin() public {
        vm.prank(stranger);
        vm.expectRevert();
        guardian.registerAgent(agentId2, _buildPolicy());
    }

    function testRegisterAgentDuplicateReverts() public {
        vm.expectRevert("Agent already registered");
        guardian.registerAgent(agentId, _buildPolicy());
    }

    function testRegisterAgentInactivePolicyReverts() public {
        AgentPolicy memory policy = _buildPolicy();
        policy.isActive = false;
        vm.expectRevert("Policy must be active");
        guardian.registerAgent(agentId2, policy);
    }

    // =========================================================================
    // Policy Updates
    // =========================================================================

    function testUpdatePolicy() public {
        AgentPolicy memory newPolicy = _buildPolicy();
        newPolicy.maxTransactionValue = 5 ether;
        guardian.updatePolicy(agentId, newPolicy);

        (uint256 maxTx,,,,,,,,,) = guardian.getAgentPolicy(agentId);
        assertEq(maxTx, 5 ether);
    }

    function testUpdatePolicyOnlyAdmin() public {
        vm.prank(stranger);
        vm.expectRevert();
        guardian.updatePolicy(agentId, _buildPolicy());
    }

    function testUpdatePolicyNonexistentReverts() public {
        vm.expectRevert("Agent not registered");
        guardian.updatePolicy(agentId2, _buildPolicy());
    }

    // =========================================================================
    // Verdict Processing — Approved
    // =========================================================================

    function testProcessVerdictApproved() public {
        bytes memory verdict =
            _buildVerdict(agentId, true, "", approvedDex, normalSig, 0.5 ether, 0);

        vm.prank(workflow);
        guardian.processVerdict(verdict);

        (uint256 approved,,,) = guardian.getActionStats(agentId);
        assertEq(approved, 1);
    }

    function testProcessVerdictApprovedEmitsEvent() public {
        bytes memory verdict =
            _buildVerdict(agentId, true, "", approvedDex, normalSig, 0.5 ether, 0);

        vm.prank(workflow);
        vm.expectEmit(true, false, false, true);
        emit SentinelGuardian.ActionApproved(agentId, approvedDex, 0.5 ether, block.timestamp);
        guardian.processVerdict(verdict);
    }

    function testProcessVerdictApprovedTracksVolume() public {
        bytes memory verdict =
            _buildVerdict(agentId, true, "", approvedDex, normalSig, 0.5 ether, 0);

        vm.prank(workflow);
        guardian.processVerdict(verdict);

        assertEq(guardian.dailyVolume(agentId), 0.5 ether);
    }

    // =========================================================================
    // Verdict Processing — Denied
    // =========================================================================

    function testProcessVerdictDenied() public {
        bytes memory verdict =
            _buildVerdict(agentId, false, "AI consensus: unsafe", approvedDex, normalSig, 0.5 ether, 0);

        vm.prank(workflow);
        guardian.processVerdict(verdict);

        assertEq(uint8(guardian.agentStates(agentId)), uint8(AgentState.Frozen));
    }

    function testProcessVerdictDeniedEmitsCircuitBreaker() public {
        bytes memory verdict =
            _buildVerdict(agentId, false, "AI consensus: unsafe", approvedDex, normalSig, 0.5 ether, 0);

        vm.prank(workflow);
        vm.expectEmit(true, false, false, false);
        emit SentinelGuardian.CircuitBreakerTriggered(
            agentId, "AI consensus: unsafe", IncidentType.ConsensusFailure, block.timestamp
        );
        guardian.processVerdict(verdict);
    }

    function testProcessVerdictDeniedLogsIncident() public {
        bytes memory verdict =
            _buildVerdict(agentId, false, "AI consensus: unsafe", approvedDex, normalSig, 0.5 ether, 0);

        vm.prank(workflow);
        guardian.processVerdict(verdict);

        assertEq(guardian.getIncidentCount(agentId), 1);
        IncidentLog memory log = guardian.getIncident(agentId, 0);
        assertEq(log.agentId, agentId);
        assertEq(uint8(log.incidentType), uint8(IncidentType.ConsensusFailure));
    }

    function testProcessVerdictOnlyWorkflow() public {
        bytes memory verdict =
            _buildVerdict(agentId, true, "", approvedDex, normalSig, 0.5 ether, 0);

        vm.prank(stranger);
        vm.expectRevert();
        guardian.processVerdict(verdict);
    }

    function testProcessVerdictFrozenAgentReverts() public {
        // First freeze the agent
        guardian.freezeAgent(agentId);

        bytes memory verdict =
            _buildVerdict(agentId, true, "", approvedDex, normalSig, 0.5 ether, 0);

        vm.prank(workflow);
        vm.expectRevert("Agent not active");
        guardian.processVerdict(verdict);
    }

    function testProcessVerdictRevokedAgentReverts() public {
        guardian.revokeAgent(agentId);

        bytes memory verdict =
            _buildVerdict(agentId, true, "", approvedDex, normalSig, 0.5 ether, 0);

        vm.prank(workflow);
        vm.expectRevert("Agent not active");
        guardian.processVerdict(verdict);
    }

    function testProcessVerdictUnregisteredAgentReverts() public {
        bytes memory verdict =
            _buildVerdict(agentId2, true, "", approvedDex, normalSig, 0.5 ether, 0);

        vm.prank(workflow);
        vm.expectRevert("Agent not registered");
        guardian.processVerdict(verdict);
    }

    // =========================================================================
    // Policy Enforcement — Value Limit
    // =========================================================================

    function testPolicyRejectsExcessiveValue() public {
        // AI approved, but value exceeds 1 ETH policy limit
        bytes memory verdict =
            _buildVerdict(agentId, true, "", approvedDex, normalSig, 100 ether, 0);

        vm.prank(workflow);
        guardian.processVerdict(verdict);

        // Should be frozen due to policy violation
        assertEq(uint8(guardian.agentStates(agentId)), uint8(AgentState.Frozen));
        assertEq(guardian.getIncidentCount(agentId), 1);
    }

    // =========================================================================
    // Policy Enforcement — Unapproved Target
    // =========================================================================

    function testPolicyRejectsUnapprovedTarget() public {
        bytes memory verdict =
            _buildVerdict(agentId, true, "", unapprovedContract, normalSig, 0.1 ether, 0);

        vm.prank(workflow);
        guardian.processVerdict(verdict);

        assertEq(uint8(guardian.agentStates(agentId)), uint8(AgentState.Frozen));
        IncidentLog memory log = guardian.getIncident(agentId, 0);
        assertEq(uint8(log.incidentType), uint8(IncidentType.PolicyViolation));
    }

    // =========================================================================
    // Policy Enforcement — Blocked Function
    // =========================================================================

    function testPolicyRejectsBlockedFunction() public {
        bytes memory verdict =
            _buildVerdict(agentId, true, "", approvedDex, blockedSig, 0.1 ether, 0);

        vm.prank(workflow);
        guardian.processVerdict(verdict);

        assertEq(uint8(guardian.agentStates(agentId)), uint8(AgentState.Frozen));
    }

    // =========================================================================
    // Policy Enforcement — Infinite Mint
    // =========================================================================

    function testPolicyRejectsInfiniteMint() public {
        // Attempt to mint 1 billion tokens (cap is 1 million)
        bytes memory verdict =
            _buildVerdict(agentId, true, "", approvedDex, normalSig, 0, 1_000_000_000e18);

        vm.prank(workflow);
        guardian.processVerdict(verdict);

        assertEq(uint8(guardian.agentStates(agentId)), uint8(AgentState.Frozen));
        IncidentLog memory log = guardian.getIncident(agentId, 0);
        assertEq(uint8(log.incidentType), uint8(IncidentType.PolicyViolation));
    }

    function testPolicyAllowsSmallMint() public {
        bytes memory verdict =
            _buildVerdict(agentId, true, "", approvedDex, normalSig, 0, 500_000e18);

        vm.prank(workflow);
        guardian.processVerdict(verdict);

        assertEq(uint8(guardian.agentStates(agentId)), uint8(AgentState.Active));
        (uint256 approved,,,) = guardian.getActionStats(agentId);
        assertEq(approved, 1);
    }

    // =========================================================================
    // Freeze / Unfreeze / Revoke
    // =========================================================================

    function testFreezeAgentByAdmin() public {
        guardian.freezeAgent(agentId);
        assertEq(uint8(guardian.agentStates(agentId)), uint8(AgentState.Frozen));
    }

    function testFreezeAgentByWorkflow() public {
        vm.prank(workflow);
        guardian.freezeAgent(agentId);
        assertEq(uint8(guardian.agentStates(agentId)), uint8(AgentState.Frozen));
    }

    function testFreezeAgentEmitsEvent() public {
        vm.expectEmit(true, false, false, true);
        emit SentinelGuardian.AgentFrozen(agentId, block.timestamp);
        guardian.freezeAgent(agentId);
    }

    function testFreezeAlreadyFrozenReverts() public {
        guardian.freezeAgent(agentId);
        vm.expectRevert("Agent not active");
        guardian.freezeAgent(agentId);
    }

    function testFreezeByStrangerReverts() public {
        vm.prank(stranger);
        vm.expectRevert("Not authorized to freeze");
        guardian.freezeAgent(agentId);
    }

    function testUnfreezeAgent() public {
        guardian.freezeAgent(agentId);
        guardian.unfreezeAgent(agentId);
        assertEq(uint8(guardian.agentStates(agentId)), uint8(AgentState.Active));
    }

    function testUnfreezeAgentEmitsEvent() public {
        guardian.freezeAgent(agentId);
        vm.expectEmit(true, false, false, true);
        emit SentinelGuardian.AgentUnfrozen(agentId, block.timestamp);
        guardian.unfreezeAgent(agentId);
    }

    function testUnfreezeOnlyAdmin() public {
        guardian.freezeAgent(agentId);
        vm.prank(workflow);
        vm.expectRevert();
        guardian.unfreezeAgent(agentId);
    }

    function testUnfreezeActiveReverts() public {
        vm.expectRevert("Agent not frozen");
        guardian.unfreezeAgent(agentId);
    }

    function testRevokeAgent() public {
        guardian.revokeAgent(agentId);
        assertEq(uint8(guardian.agentStates(agentId)), uint8(AgentState.Revoked));
    }

    function testRevokeAgentPermanent() public {
        guardian.revokeAgent(agentId);
        vm.expectRevert("Agent not frozen");
        guardian.unfreezeAgent(agentId);
    }

    function testRevokeAlreadyRevokedReverts() public {
        guardian.revokeAgent(agentId);
        vm.expectRevert("Already revoked");
        guardian.revokeAgent(agentId);
    }

    // =========================================================================
    // Rate Limit Tracking
    // =========================================================================

    function testRateLimitTracking() public {
        bytes memory verdict =
            _buildVerdict(agentId, true, "", approvedDex, normalSig, 0.1 ether, 0);

        for (uint256 i = 0; i < 3; i++) {
            vm.prank(workflow);
            guardian.processVerdict(verdict);
        }

        (,, uint256 windowActions,) = guardian.getActionStats(agentId);
        assertEq(windowActions, 3);
    }

    function testRateLimitWindowReset() public {
        bytes memory verdict =
            _buildVerdict(agentId, true, "", approvedDex, normalSig, 0.1 ether, 0);

        // Fill to 3 actions
        for (uint256 i = 0; i < 3; i++) {
            vm.prank(workflow);
            guardian.processVerdict(verdict);
        }

        // Warp past rate limit window (60 seconds)
        vm.warp(block.timestamp + 61);

        vm.prank(workflow);
        guardian.processVerdict(verdict);

        // Window reset — count should be 1
        (,, uint256 windowActions,) = guardian.getActionStats(agentId);
        assertEq(windowActions, 1);
    }

    // =========================================================================
    // Daily Volume
    // =========================================================================

    function testDailyVolumeTracking() public {
        bytes memory v1 =
            _buildVerdict(agentId, true, "", approvedDex, normalSig, 0.3 ether, 0);
        bytes memory v2 =
            _buildVerdict(agentId, true, "", approvedDex, normalSig, 0.2 ether, 0);

        vm.prank(workflow);
        guardian.processVerdict(v1);
        vm.prank(workflow);
        guardian.processVerdict(v2);

        (,,, uint256 volume) = guardian.getActionStats(agentId);
        assertEq(volume, 0.5 ether);
    }

    // =========================================================================
    // Pause
    // =========================================================================

    function testPauseBlocksVerdicts() public {
        guardian.pause();

        bytes memory verdict =
            _buildVerdict(agentId, true, "", approvedDex, normalSig, 0.5 ether, 0);

        vm.prank(workflow);
        vm.expectRevert();
        guardian.processVerdict(verdict);
    }

    function testUnpauseResumesVerdicts() public {
        guardian.pause();
        guardian.unpause();

        bytes memory verdict =
            _buildVerdict(agentId, true, "", approvedDex, normalSig, 0.5 ether, 0);

        vm.prank(workflow);
        guardian.processVerdict(verdict);

        (uint256 approved,,,) = guardian.getActionStats(agentId);
        assertEq(approved, 1);
    }

    // =========================================================================
    // Multiple Agents
    // =========================================================================

    function testMultipleAgentsIndependent() public {
        // Register second agent
        guardian.registerAgent(agentId2, _buildPolicy());

        // Freeze agent 1
        guardian.freezeAgent(agentId);

        // Agent 2 should still work
        bytes memory verdict =
            _buildVerdict(agentId2, true, "", approvedDex, normalSig, 0.5 ether, 0);

        vm.prank(workflow);
        guardian.processVerdict(verdict);

        assertEq(uint8(guardian.agentStates(agentId)), uint8(AgentState.Frozen));
        assertEq(uint8(guardian.agentStates(agentId2)), uint8(AgentState.Active));
    }

    // =========================================================================
    // Incident History Bounds
    // =========================================================================

    function testIncidentHistoryBounded() public {
        // We need to trigger many incidents. Register fresh agents for each.
        // Actually, the agent gets frozen after first denial. So we freeze/unfreeze.
        // Instead, use admin manual freeze which logs incidents without processing verdicts.
        bytes32 testAgent = bytes32(uint256(0x99));
        guardian.registerAgent(testAgent, _buildPolicy());

        // Log 3 manual freezes + unfreezes
        for (uint256 i = 0; i < 3; i++) {
            guardian.freezeAgent(testAgent);
            guardian.unfreezeAgent(testAgent);
        }

        assertEq(guardian.getIncidentCount(testAgent), 3);
    }

    // =========================================================================
    // View Functions
    // =========================================================================

    function testIsAgentActive() public view {
        assertTrue(guardian.isAgentActive(agentId));
        assertFalse(guardian.isAgentActive(agentId2)); // not registered
    }

    function testGetIncidentOutOfBoundsReverts() public {
        vm.expectRevert("Index out of bounds");
        guardian.getIncident(agentId, 0);
    }
}
