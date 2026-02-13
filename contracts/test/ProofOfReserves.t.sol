// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";
import {SentinelGuardian, AgentState} from "../src/SentinelGuardian.sol";
import {AgentPolicy} from "../src/libraries/PolicyLib.sol";
import {MockV3Aggregator} from "./mocks/MockV3Aggregator.sol";

contract ProofOfReservesTest is Test {
    SentinelGuardian public guardian;
    MockV3Aggregator public reserveFeed;

    address public workflow = address(0xC5E1);
    address public approvedDex = address(0xAA01);
    bytes4 public mintSig = bytes4(0x40c10f19);

    bytes32 public agentId =
        bytes32(uint256(0x506F524167656E74000000000000000000000000000000000000000000000001));

    // 10M reserves (in token units, 18 decimals)
    int256 public constant INITIAL_RESERVES = 10_000_000e18;

    function _porPolicy(address feed) internal view returns (AgentPolicy memory) {
        address[] memory approved = new address[](1);
        approved[0] = approvedDex;
        bytes4[] memory blocked = new bytes4[](0);

        return AgentPolicy({
            maxTransactionValue: 0,
            maxDailyVolume: 0,
            maxMintAmount: 1_000_000e18,
            rateLimit: 10,
            rateLimitWindow: 60,
            approvedContracts: approved,
            blockedFunctions: blocked,
            requireMultiAiConsensus: true,
            isActive: true,
            reserveFeed: feed,
            minReserveRatio: 10000, // 100% collateralization
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

        reserveFeed = new MockV3Aggregator(18, INITIAL_RESERVES);
        guardian = new SentinelGuardian();
        guardian.grantRole(guardian.WORKFLOW_ROLE(), workflow);
        guardian.registerAgent(agentId, _porPolicy(address(reserveFeed)));
    }

    // =========================================================================
    // PoR Tests
    // =========================================================================

    function testReserveCheckPassesSufficientReserves() public {
        // Mint 500K tokens — reserves are 10M, ratio 100% — passes
        bytes memory data = _verdict(agentId, true, "", approvedDex, mintSig, 0, 500_000e18);
        vm.prank(workflow);
        guardian.processVerdict(data);

        assertEq(guardian.totalApproved(agentId), 1);
        assertEq(guardian.cumulativeMints(agentId), 500_000e18);
    }

    function testReserveCheckFailsInsufficientReserves() public {
        // Set reserves to only 100K
        reserveFeed.updateAnswer(100_000e18);

        // Try to mint 500K — insufficient reserves
        bytes memory data = _verdict(agentId, true, "", approvedDex, mintSig, 0, 500_000e18);
        vm.prank(workflow);
        guardian.processVerdict(data);

        // Should be frozen — PoR check failed
        assertEq(uint8(guardian.agentStates(agentId)), uint8(AgentState.Frozen));
        assertEq(guardian.totalDenied(agentId), 1);
    }

    function testReserveCheckSkippedNoFeed() public {
        // Register agent without reserve feed
        bytes32 noFeedAgent = bytes32(uint256(0x02));
        AgentPolicy memory policy = _porPolicy(address(0)); // No feed
        guardian.registerAgent(noFeedAgent, policy);

        // Mint should pass without PoR check
        bytes memory data = _verdict(noFeedAgent, true, "", approvedDex, mintSig, 0, 500_000e18);
        vm.prank(workflow);
        guardian.processVerdict(data);

        assertEq(guardian.totalApproved(noFeedAgent), 1);
    }

    function testReserveCheckSkippedZeroMint() public {
        // Non-mint operation (value transfer) — PoR skipped
        bytes memory data = _verdict(agentId, true, "", approvedDex, bytes4(0x38ed1739), 0, 0);
        vm.prank(workflow);
        guardian.processVerdict(data);

        assertEq(guardian.totalApproved(agentId), 1);
        assertEq(guardian.cumulativeMints(agentId), 0);
    }

    function testCumulativeMintsTracked() public {
        // 3 sequential mints of 200K each
        for (uint256 i = 0; i < 3; i++) {
            bytes memory data = _verdict(agentId, true, "", approvedDex, mintSig, 0, 200_000e18);
            vm.prank(workflow);
            guardian.processVerdict(data);
        }

        assertEq(guardian.cumulativeMints(agentId), 600_000e18);
        assertEq(guardian.totalApproved(agentId), 3);
    }

    function testCumulativeDrainFailsLater() public {
        // Set reserves to 1.5M (enough for first mint, not for cumulative)
        reserveFeed.updateAnswer(1_500_000e18);

        // First mint: 800K — cumulative = 800K, reserves 1.5M, passes
        bytes memory data1 = _verdict(agentId, true, "", approvedDex, mintSig, 0, 800_000e18);
        vm.prank(workflow);
        guardian.processVerdict(data1);
        assertEq(guardian.totalApproved(agentId), 1);

        // Unfreeze agent (it won't be frozen since first mint passed)
        // Second mint: 800K — cumulative would be 1.6M, reserves only 1.5M, fails
        bytes memory data2 = _verdict(agentId, true, "", approvedDex, mintSig, 0, 800_000e18);
        vm.prank(workflow);
        guardian.processVerdict(data2);

        // Agent frozen — cumulative drain detected
        assertEq(uint8(guardian.agentStates(agentId)), uint8(AgentState.Frozen));
        assertEq(guardian.totalDenied(agentId), 1);
        assertEq(guardian.cumulativeMints(agentId), 800_000e18); // Only first mint counted
    }

    function testNegativeReserveFeedDenied() public {
        // Feed returns negative
        reserveFeed.updateAnswer(-1);

        bytes memory data = _verdict(agentId, true, "", approvedDex, mintSig, 0, 100_000e18);
        vm.prank(workflow);
        guardian.processVerdict(data);

        assertEq(uint8(guardian.agentStates(agentId)), uint8(AgentState.Frozen));
    }

    function testReserveRatio150Percent() public {
        // Register agent with 150% collateralization requirement
        bytes32 overCollAgent = bytes32(uint256(0x03));
        AgentPolicy memory policy = _porPolicy(address(reserveFeed));
        policy.minReserveRatio = 15000; // 150%
        guardian.registerAgent(overCollAgent, policy);

        // Reserves = 10M. With 150%, max mint = 10M / 1.5 = ~6.67M
        // Try mint 7M — should fail (7M * 1.5 = 10.5M > 10M reserves)
        bytes memory data = _verdict(overCollAgent, true, "", approvedDex, mintSig, 0, 7_000_000e18);
        vm.prank(workflow);
        guardian.processVerdict(data);

        assertEq(uint8(guardian.agentStates(overCollAgent)), uint8(AgentState.Frozen));
    }

    function testFeedPriceUpdateChangesBehavior() public {
        // Initial reserves = 10M — mint 500K passes
        bytes memory data = _verdict(agentId, true, "", approvedDex, mintSig, 0, 500_000e18);
        vm.prank(workflow);
        guardian.processVerdict(data);
        assertEq(guardian.totalApproved(agentId), 1);

        // Now drop reserves to just above cumulative (600K for cumulative 500K)
        reserveFeed.updateAnswer(600_000e18);

        // Mint another 200K — cumulative would be 700K, reserves only 600K, fails
        bytes memory data2 = _verdict(agentId, true, "", approvedDex, mintSig, 0, 200_000e18);
        vm.prank(workflow);
        guardian.processVerdict(data2);

        assertEq(uint8(guardian.agentStates(agentId)), uint8(AgentState.Frozen));
    }

    function testProcessVerdictIntegrationAiApprovesPorDenies() public {
        // Set reserves very low
        reserveFeed.updateAnswer(10_000e18); // Only 10K reserves

        // AI verdict says approved, but PoR will reject
        bytes memory data = _verdict(agentId, true, "Action appears safe", approvedDex, mintSig, 0, 500_000e18);
        vm.prank(workflow);
        guardian.processVerdict(data);

        // Should be frozen — AI approved but PoR denied
        assertEq(uint8(guardian.agentStates(agentId)), uint8(AgentState.Frozen));
        assertEq(guardian.totalDenied(agentId), 1);
        assertEq(guardian.totalApproved(agentId), 0);
    }
}
