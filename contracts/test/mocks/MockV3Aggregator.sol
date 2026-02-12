// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title MockV3Aggregator — Test mock for Chainlink AggregatorV3Interface
contract MockV3Aggregator {
    int256 private _answer;
    uint8 private _decimals;

    constructor(uint8 decimals_, int256 initialAnswer) {
        _decimals = decimals_;
        _answer = initialAnswer;
    }

    function updateAnswer(int256 newAnswer) external {
        _answer = newAnswer;
    }

    function latestRoundData()
        external
        view
        returns (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound)
    {
        return (1, _answer, block.timestamp, block.timestamp, 1);
    }

    function decimals() external view returns (uint8) {
        return _decimals;
    }
}
