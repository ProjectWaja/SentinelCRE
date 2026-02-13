// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";
import {SentinelGuardian, AgentState} from "../src/SentinelGuardian.sol";
import {AgentRegistry} from "../src/AgentRegistry.sol";
import {AgentPolicy} from "../src/libraries/PolicyLib.sol";

contract IntegrationTest is Test {
    SentinelGuardian public guardian;
    AgentRegistry public registry;

    address public workflow = address(0xC5E1);
    address public approvedDex = address(0xAA01);
    bytes4 public normalSig = bytes4(0x38ed1739);
    bytes4 public blockedSig = bytes4(0xff00ff00);

    bytes32 public tradingAgent =
        bytes32(uint256(0x54726164696E674167656E7400000000000000000000000000000000000001));
    bytes32 public mintingAgent =
        bytes32(uint256(0x4D696E74696E674167656E7400000000000000000000000000000000000002));

    function _tradingPolicy() internal view returns (AgentPolicy memory) {
        address[] memory approved = new address[](1);
        approved[0] = approvedDex;
        bytes4[] memory blocked = new bytes4[](1);
        blocked[0] = blockedSig;

        return AgentPolicy({
            maxTransactionValue: 1 ether,
            maxDailyVolume: 10 ether,
            maxMintAmount: 0, // No mint cap — trading only
            rateLimit: 10,
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

    function _mintingPolicy() internal view returns (AgentPolicy memory) {
        address[] memory approved = new address[](1);
        approved[0] = approvedDex;
        bytes4[] memory blocked = new bytes4[](0);

        return AgentPolicy({
            maxTransactionValue: 0, // No ETH transfers
            maxDailyVolume: 0,
            maxMintAmount: 1_000_000e18, // 1M token mint cap
            rateLimit: 5,
            rateLimitWindow: 300,
            approvedContracts: approved,
            blockedFunctions: blocked,
            requireMultiAiConsensus: true,
            isActive: true,
            reserveFeed: address(0),
            minReserveRatio: 0,
            maxStaleness: 0
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
        registry = new AgentRegistry();

        guardian.grantRole(guardian.WORKFLOW_ROLE(), workflow);

        // Register both agents in both contracts
        registry.registerAgent(tradingAgent, "TradingBot", "DeFi swap agent");
        registry.registerAgent(mintingAgent, "MintBot", "Stablecoin minting agent");

        guardian.registerAgent(tradingAgent, _tradingPolicy());
        guardian.registerAgent(mintingAgent, _mintingPolicy());
    }

    // =========================================================================
    // Full Approval Flow
    // =========================================================================

    function testFullApprovalFlow() public {
        bytes memory v = _verdict(tradingAgent, true, "", approvedDex, normalSig, 0.5 ether, 0);

        vm.prank(workflow);
        guardian.processVerdict(v);

        assertTrue(guardian.isAgentActive(tradingAgent));
        (uint256 approved,,,) = guardian.getActionStats(tradingAgent);
        assertEq(approved, 1);
    }

    // =========================================================================
    // Full Denial Flow
    // =========================================================================

    function testFullDenialFlow() public {
        bytes memory v =
            _verdict(tradingAgent, false, "Suspicious trading pattern", approvedDex, normalSig, 0.5 ether, 0);

        vm.prank(workflow);
        guardian.processVerdict(v);

        assertEq(uint8(guardian.agentStates(tradingAgent)), uint8(AgentState.Frozen));
        assertEq(guardian.getIncidentCount(tradingAgent), 1);
        (, uint256 denied,,) = guardian.getActionStats(tradingAgent);
        assertEq(denied, 1);
    }

    // =========================================================================
    // Infinite Mint Attack Blocked
    // =========================================================================

    function testInfiniteMintBlocked() public {
        // Bad actor tries to mint 1 billion stablecoins (cap is 1M)
        bytes memory v =
            _verdict(mintingAgent, true, "", approvedDex, normalSig, 0, 1_000_000_000e18);

        vm.prank(workflow);
        guardian.processVerdict(v);

        // Agent should be frozen
        assertEq(uint8(guardian.agentStates(mintingAgent)), uint8(AgentState.Frozen));

        // Incident should be logged as PolicyViolation
        assertEq(guardian.getIncidentCount(mintingAgent), 1);
    }

    function testSmallMintAllowed() public {
        bytes memory v =
            _verdict(mintingAgent, true, "", approvedDex, normalSig, 0, 100_000e18);

        vm.prank(workflow);
        guardian.processVerdict(v);

        assertTrue(guardian.isAgentActive(mintingAgent));
    }

    // =========================================================================
    // Multiple Approved Then Denied
    // =========================================================================

    function testMultipleApprovedThenDenied() public {
        // 3 approved trades
        for (uint256 i = 0; i < 3; i++) {
            bytes memory v = _verdict(tradingAgent, true, "", approvedDex, normalSig, 0.1 ether, 0);
            vm.prank(workflow);
            guardian.processVerdict(v);
        }

        (uint256 approved,,,) = guardian.getActionStats(tradingAgent);
        assertEq(approved, 3);

        // Now a denial
        bytes memory deny =
            _verdict(tradingAgent, false, "Rogue behavior", approvedDex, normalSig, 0.1 ether, 0);
        vm.prank(workflow);
        guardian.processVerdict(deny);

        assertEq(uint8(guardian.agentStates(tradingAgent)), uint8(AgentState.Frozen));
    }

    // =========================================================================
    // Freeze Prevents Further Verdicts
    // =========================================================================

    function testFreezePreventsFurtherVerdicts() public {
        guardian.freezeAgent(tradingAgent);

        bytes memory v = _verdict(tradingAgent, true, "", approvedDex, normalSig, 0.1 ether, 0);
        vm.prank(workflow);
        vm.expectRevert("Agent not active");
        guardian.processVerdict(v);
    }

    // =========================================================================
    // Unfreeze Re-enables Verdicts
    // =========================================================================

    function testUnfreezeReenablesVerdicts() public {
        guardian.freezeAgent(tradingAgent);
        guardian.unfreezeAgent(tradingAgent);

        bytes memory v = _verdict(tradingAgent, true, "", approvedDex, normalSig, 0.1 ether, 0);
        vm.prank(workflow);
        guardian.processVerdict(v);

        (uint256 approved,,,) = guardian.getActionStats(tradingAgent);
        assertEq(approved, 1);
    }

    // =========================================================================
    // Registry + Guardian Wiring
    // =========================================================================

    function testRegistryAndGuardianWiring() public view {
        // Both agents registered in both contracts
        assertTrue(registry.isRegistered(tradingAgent));
        assertTrue(registry.isRegistered(mintingAgent));
        assertTrue(guardian.isAgentActive(tradingAgent));
        assertTrue(guardian.isAgentActive(mintingAgent));
        assertEq(registry.getAgentCount(), 2);
    }
}
