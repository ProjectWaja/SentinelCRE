// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title ISentinelGuardian — External interface for reading guardian state
interface ISentinelGuardian {
    function getAgentState(bytes32 agentId) external view returns (uint8);
    function getIncidentCount(bytes32 agentId) external view returns (uint256);
    function isAgentActive(bytes32 agentId) external view returns (bool);
}
