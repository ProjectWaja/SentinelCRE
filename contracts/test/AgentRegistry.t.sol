// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";
import {AgentRegistry, AgentMetadata} from "../src/AgentRegistry.sol";

contract AgentRegistryTest is Test {
    AgentRegistry public registry;

    bytes32 public agentId =
        bytes32(uint256(0x53656E74696E656C4167656E74303100000000000000000000000000000001));
    bytes32 public agentId2 =
        bytes32(uint256(0x53656E74696E656C4167656E74303200000000000000000000000000000002));

    function setUp() public {
        vm.warp(1000);
        registry = new AgentRegistry();
    }

    function testRegisterAgent() public {
        registry.registerAgent(agentId, "TradingBot", "DeFi trading agent");

        AgentMetadata memory meta = registry.getAgent(agentId);
        assertEq(meta.name, "TradingBot");
        assertEq(meta.description, "DeFi trading agent");
        assertEq(meta.owner, address(this));
        assertEq(meta.registeredAt, uint64(block.timestamp));
        assertTrue(meta.exists);
    }

    function testRegisterAgentEmitsEvent() public {
        vm.expectEmit(true, false, false, true);
        emit AgentRegistry.AgentRegistered(agentId, "TradingBot", address(this), uint64(block.timestamp));
        registry.registerAgent(agentId, "TradingBot", "DeFi trading agent");
    }

    function testDuplicateRegistrationReverts() public {
        registry.registerAgent(agentId, "TradingBot", "DeFi trading agent");
        vm.expectRevert("Agent already registered");
        registry.registerAgent(agentId, "TradingBot2", "Another agent");
    }

    function testGetAgentMetadata() public {
        registry.registerAgent(agentId, "MintBot", "Stablecoin minting agent");

        AgentMetadata memory meta = registry.getAgent(agentId);
        assertEq(meta.name, "MintBot");
        assertEq(meta.description, "Stablecoin minting agent");
    }

    function testGetAgentCount() public {
        assertEq(registry.getAgentCount(), 0);

        registry.registerAgent(agentId, "Bot1", "First");
        assertEq(registry.getAgentCount(), 1);

        registry.registerAgent(agentId2, "Bot2", "Second");
        assertEq(registry.getAgentCount(), 2);
    }

    function testGetAgentIdAt() public {
        registry.registerAgent(agentId, "Bot1", "First");
        registry.registerAgent(agentId2, "Bot2", "Second");

        assertEq(registry.getAgentIdAt(0), agentId);
        assertEq(registry.getAgentIdAt(1), agentId2);
    }

    function testGetAgentIdAtOutOfBoundsReverts() public {
        vm.expectRevert("Index out of bounds");
        registry.getAgentIdAt(0);
    }

    function testIsRegistered() public {
        assertFalse(registry.isRegistered(agentId));
        registry.registerAgent(agentId, "Bot1", "First");
        assertTrue(registry.isRegistered(agentId));
    }
}
