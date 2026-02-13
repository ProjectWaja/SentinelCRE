// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/// @notice Metadata for a registered AI agent
struct AgentMetadata {
    string name;
    string description;
    address owner;
    uint64 registeredAt;
    bool exists;
}

/// @title AgentRegistry — Registration and metadata for AI agents
contract AgentRegistry is Ownable {
    mapping(bytes32 => AgentMetadata) internal _agents;
    bytes32[] public agentIds;

    event AgentRegistered(bytes32 indexed agentId, string name, address owner, uint64 timestamp);

    constructor() Ownable(msg.sender) {}

    /// @notice Register a new AI agent
    function registerAgent(bytes32 agentId, string calldata name, string calldata description)
        external
    {
        require(!_agents[agentId].exists, "Agent already registered");

        _agents[agentId] = AgentMetadata({
            name: name,
            description: description,
            owner: msg.sender,
            registeredAt: uint64(block.timestamp),
            exists: true
        });
        agentIds.push(agentId);

        emit AgentRegistered(agentId, name, msg.sender, uint64(block.timestamp));
    }

    function getAgent(bytes32 agentId) external view returns (AgentMetadata memory) {
        return _agents[agentId];
    }

    function getAgentCount() external view returns (uint256) {
        return agentIds.length;
    }

    function getAgentIdAt(uint256 index) external view returns (bytes32) {
        require(index < agentIds.length, "Index out of bounds");
        return agentIds[index];
    }

    function isRegistered(bytes32 agentId) external view returns (bool) {
        return _agents[agentId].exists;
    }
}
