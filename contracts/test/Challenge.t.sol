// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";
import {SentinelGuardian, AgentState, IncidentType} from "../src/SentinelGuardian.sol";
import {AgentPolicy} from "../src/libraries/PolicyLib.sol";
import {Severity, ChallengeStatus, ChallengeWindow} from "../src/interfaces/IChallenge.sol";

contract ChallengeTest is Test {
    SentinelGuardian public guardian;

    address public admin = address(this);
    address public workflow = address(0xC5E1);
    address public challenger = address(0xC4A1);
    address public stranger = address(0xDEAD);
    address public approvedDex = address(0xAA01);

    bytes4 public normalSig = bytes4(0x38ed1739);
    bytes4 public blockedSig = bytes4(0xff00ff00);

    bytes32 public agentId =
        bytes32(uint256(0x4368616C6C656E67654167656E740000000000000000000000000000000001));

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
            minReserveRatio: 0
        });
    }

    function _verdict(
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
        vm.warp(1000);

        guardian = new SentinelGuardian();
        guardian.grantRole(guardian.WORKFLOW_ROLE(), workflow);
        guardian.grantRole(guardian.CHALLENGER_ROLE(), challenger);
        guardian.registerAgent(agentId, _buildPolicy());
    }

    // =========================================================================
    // Severity Classification
    // =========================================================================

    function testCriticalSeverityInstantFreeze() public {
        // Value 100 ETH = 100x the 1 ETH limit → Critical, no challenge
        bytes memory data = _verdict(agentId, true, "", approvedDex, normalSig, 100 ether, 0);
        vm.prank(workflow);
        guardian.processVerdict(data);

        assertEq(uint8(guardian.agentStates(agentId)), uint8(AgentState.Frozen));

        // No challenge should be created (Critical = no appeal)
        ChallengeWindow memory cw = guardian.getChallenge(agentId);
        assertEq(uint8(cw.status), uint8(ChallengeStatus.None));
    }

    function testLowSeverityCreatesChallenge() public {
        // Consensus failure with low value → Low severity → 1 hour window
        bytes memory data = _verdict(agentId, false, "Models disagree", approvedDex, normalSig, 0.1 ether, 0);
        vm.prank(workflow);
        guardian.processVerdict(data);

        assertEq(uint8(guardian.agentStates(agentId)), uint8(AgentState.Frozen));

        ChallengeWindow memory cw = guardian.getChallenge(agentId);
        assertEq(uint8(cw.status), uint8(ChallengeStatus.Pending));
        assertEq(uint8(cw.severity), uint8(Severity.Low));
        assertEq(cw.expiresAt, uint64(block.timestamp + 3600)); // 1 hour
    }

    function testMediumSeverityCreatesChallenge() public {
        // Consensus failure with value > 2x limit → Medium severity → 30 min window
        bytes memory data = _verdict(agentId, false, "Suspicious activity", approvedDex, normalSig, 3 ether, 0);
        vm.prank(workflow);
        guardian.processVerdict(data);

        ChallengeWindow memory cw = guardian.getChallenge(agentId);
        assertEq(uint8(cw.status), uint8(ChallengeStatus.Pending));
        assertEq(uint8(cw.severity), uint8(Severity.Medium));
        assertEq(cw.expiresAt, uint64(block.timestamp + 1800)); // 30 min
    }

    // =========================================================================
    // Challenge Flow
    // =========================================================================

    function testChallengeVerdictByAuthorized() public {
        // Create a low-severity denial
        bytes memory data = _verdict(agentId, false, "Minor issue", approvedDex, normalSig, 0.1 ether, 0);
        vm.prank(workflow);
        guardian.processVerdict(data);

        // Challenger appeals
        vm.prank(challenger);
        guardian.challengeVerdict(agentId);

        ChallengeWindow memory cw = guardian.getChallenge(agentId);
        assertEq(uint8(cw.status), uint8(ChallengeStatus.Appealed));
    }

    function testChallengeVerdictByUnauthorizedReverts() public {
        bytes memory data = _verdict(agentId, false, "Minor issue", approvedDex, normalSig, 0.1 ether, 0);
        vm.prank(workflow);
        guardian.processVerdict(data);

        vm.prank(stranger);
        vm.expectRevert("Not authorized to challenge");
        guardian.challengeVerdict(agentId);
    }

    function testChallengeVerdictExpiredWindowReverts() public {
        bytes memory data = _verdict(agentId, false, "Minor issue", approvedDex, normalSig, 0.1 ether, 0);
        vm.prank(workflow);
        guardian.processVerdict(data);

        // Warp past the challenge window (1 hour + 1 second)
        vm.warp(block.timestamp + 3601);

        vm.prank(challenger);
        vm.expectRevert("Challenge window expired");
        guardian.challengeVerdict(agentId);
    }

    // =========================================================================
    // Resolution
    // =========================================================================

    function testResolveChallengeApproved() public {
        // Create denial → appeal → resolve as approved
        bytes memory data = _verdict(agentId, false, "Minor issue", approvedDex, normalSig, 0.1 ether, 0);
        vm.prank(workflow);
        guardian.processVerdict(data);

        vm.prank(challenger);
        guardian.challengeVerdict(agentId);

        vm.prank(workflow);
        guardian.resolveChallenge(agentId, true, "Re-evaluation passed");

        // Agent should be unfrozen
        assertEq(uint8(guardian.agentStates(agentId)), uint8(AgentState.Active));

        ChallengeWindow memory cw = guardian.getChallenge(agentId);
        assertEq(uint8(cw.status), uint8(ChallengeStatus.Overturned));
    }

    function testResolveChallengeRejected() public {
        bytes memory data = _verdict(agentId, false, "Suspicious", approvedDex, normalSig, 0.1 ether, 0);
        vm.prank(workflow);
        guardian.processVerdict(data);

        vm.prank(challenger);
        guardian.challengeVerdict(agentId);

        vm.prank(workflow);
        guardian.resolveChallenge(agentId, false, "Still suspicious");

        // Agent stays frozen
        assertEq(uint8(guardian.agentStates(agentId)), uint8(AgentState.Frozen));

        ChallengeWindow memory cw = guardian.getChallenge(agentId);
        assertEq(uint8(cw.status), uint8(ChallengeStatus.Upheld));
    }

    function testResolveChallengeOnlyWorkflow() public {
        bytes memory data = _verdict(agentId, false, "Issue", approvedDex, normalSig, 0.1 ether, 0);
        vm.prank(workflow);
        guardian.processVerdict(data);

        vm.prank(challenger);
        guardian.challengeVerdict(agentId);

        // Stranger cannot resolve
        vm.prank(stranger);
        vm.expectRevert();
        guardian.resolveChallenge(agentId, true, "Trying to resolve");
    }

    // =========================================================================
    // Expiration
    // =========================================================================

    function testFinalizeExpiredChallenge() public {
        bytes memory data = _verdict(agentId, false, "Issue", approvedDex, normalSig, 0.1 ether, 0);
        vm.prank(workflow);
        guardian.processVerdict(data);

        // Warp past window
        vm.warp(block.timestamp + 3601);

        guardian.finalizeExpiredChallenge(agentId);

        ChallengeWindow memory cw = guardian.getChallenge(agentId);
        assertEq(uint8(cw.status), uint8(ChallengeStatus.Expired));
        // Agent stays frozen
        assertEq(uint8(guardian.agentStates(agentId)), uint8(AgentState.Frozen));
    }

    function testFinalizeNotExpiredReverts() public {
        bytes memory data = _verdict(agentId, false, "Issue", approvedDex, normalSig, 0.1 ether, 0);
        vm.prank(workflow);
        guardian.processVerdict(data);

        vm.expectRevert("Window not expired");
        guardian.finalizeExpiredChallenge(agentId);
    }

    function testNoPendingChallengeReverts() public {
        vm.prank(challenger);
        vm.expectRevert("No pending challenge");
        guardian.challengeVerdict(agentId);
    }

    // =========================================================================
    // Edge Cases
    // =========================================================================

    function testAgentFrozenDuringChallengeWindow() public {
        bytes memory data = _verdict(agentId, false, "Issue", approvedDex, normalSig, 0.1 ether, 0);
        vm.prank(workflow);
        guardian.processVerdict(data);

        // Agent is frozen — cannot process new verdicts
        bytes memory data2 = _verdict(agentId, true, "", approvedDex, normalSig, 0.5 ether, 0);
        vm.prank(workflow);
        vm.expectRevert("Agent not active");
        guardian.processVerdict(data2);
    }

    function testGetChallengeViewFunction() public {
        bytes memory data = _verdict(agentId, false, "Test reason", approvedDex, normalSig, 0.1 ether, 0);
        vm.prank(workflow);
        guardian.processVerdict(data);

        ChallengeWindow memory cw = guardian.getChallenge(agentId);
        assertEq(cw.agentId, agentId);
        assertEq(cw.createdAt, uint64(block.timestamp));
        assertEq(uint8(cw.status), uint8(ChallengeStatus.Pending));
        assertTrue(bytes(cw.reason).length > 0);
    }
}
