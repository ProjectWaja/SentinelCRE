// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title IAggregatorV3 — Chainlink Data Feed interface for Proof of Reserves
/// @notice Minimal interface matching Chainlink's AggregatorV3Interface
interface IAggregatorV3 {
    function latestRoundData()
        external
        view
        returns (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound);

    function decimals() external view returns (uint8);
}
