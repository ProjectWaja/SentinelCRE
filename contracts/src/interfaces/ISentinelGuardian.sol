// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

/// @notice State of a registered AI agent
enum AgentState {
    Active,
    Frozen,
    Revoked
}

/// @title ISentinelGuardian — External interface for reading guardian state
interface ISentinelGuardian {
    function getAgentState(bytes32 agentId) external view returns (AgentState);
    function getIncidentCount(bytes32 agentId) external view returns (uint256);
    function isAgentActive(bytes32 agentId) external view returns (bool);
}
