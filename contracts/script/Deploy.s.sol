// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script, console} from "forge-std/Script.sol";
import {SentinelGuardian} from "../src/SentinelGuardian.sol";
import {AgentRegistry} from "../src/AgentRegistry.sol";
import {AgentPolicy} from "../src/libraries/PolicyLib.sol";

contract Deploy is Script {
    function run() external {
        uint256 deployerKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address workflowAddress = vm.envOr("WORKFLOW_ADDRESS", address(0));

        vm.startBroadcast(deployerKey);

        // Deploy AgentRegistry
        AgentRegistry registry = new AgentRegistry();
        console.log("AgentRegistry deployed to:", address(registry));

        // Deploy SentinelGuardian
        SentinelGuardian guardian = new SentinelGuardian();
        console.log("SentinelGuardian deployed to:", address(guardian));

        // Grant WORKFLOW_ROLE if address provided
        if (workflowAddress != address(0)) {
            guardian.grantRole(guardian.WORKFLOW_ROLE(), workflowAddress);
            console.log("WORKFLOW_ROLE granted to:", workflowAddress);
        }

        // Register demo trading agent
        bytes32 tradingAgentId = bytes32(uint256(0x01));
        address[] memory approvedContracts = new address[](1);
        approvedContracts[0] = address(0xAA01);
        bytes4[] memory blockedFunctions = new bytes4[](1);
        blockedFunctions[0] = bytes4(0xff00ff00);

        AgentPolicy memory tradingPolicy = AgentPolicy({
            maxTransactionValue: 1 ether,
            maxDailyVolume: 10 ether,
            maxMintAmount: 0,
            rateLimit: 10,
            rateLimitWindow: 60,
            approvedContracts: approvedContracts,
            blockedFunctions: blockedFunctions,
            requireMultiAiConsensus: true,
            isActive: true
        });

        guardian.registerAgent(tradingAgentId, tradingPolicy);
        registry.registerAgent(tradingAgentId, "TradingBot", "DeFi trading agent");
        console.log("Trading agent registered");

        // Register demo minting agent
        bytes32 mintingAgentId = bytes32(uint256(0x02));
        bytes4[] memory noBlocked = new bytes4[](0);

        AgentPolicy memory mintingPolicy = AgentPolicy({
            maxTransactionValue: 0,
            maxDailyVolume: 0,
            maxMintAmount: 1_000_000e18,
            rateLimit: 5,
            rateLimitWindow: 300,
            approvedContracts: approvedContracts,
            blockedFunctions: noBlocked,
            requireMultiAiConsensus: true,
            isActive: true
        });

        guardian.registerAgent(mintingAgentId, mintingPolicy);
        registry.registerAgent(mintingAgentId, "MintBot", "Stablecoin minting agent");
        console.log("Minting agent registered");

        vm.stopBroadcast();

        console.log("\n=== Deployment Complete ===");
        console.log("AgentRegistry:", address(registry));
        console.log("SentinelGuardian:", address(guardian));
    }
}
