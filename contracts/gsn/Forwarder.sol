// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract Forwarder {
    // Minimal forwarder implementation
    address public trustedForwarder;
    
    constructor() {
        trustedForwarder = msg.sender;
    }
    
    function getNonce(address) public pure returns (uint256) {
        return 0; // Simplified for testing
    }
    
    function verify(
        address,
        uint256,
        bytes memory,
        bytes memory
    ) public pure returns (bool) {
        return true; // Simplified for testing
    }
    
    // Accept ETH (optional)
    receive() external payable {}
}