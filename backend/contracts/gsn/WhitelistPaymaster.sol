// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract WhitelistPaymaster {
    address public owner;
    mapping(address => bool) public whitelist;
    mapping(address => bool) public acceptedTargets;
    
    event UserWhitelisted(address user);
    event TargetAccepted(address target);
    event ReceivedETH(address from, uint256 amount);
    
    constructor() {
        owner = msg.sender;
        whitelist[msg.sender] = true; // Auto-whitelist deployer
    }
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }
    
    function whitelistUser(address user) external onlyOwner {
        whitelist[user] = true;
        emit UserWhitelisted(user);
    }
    
    function removeUser(address user) external onlyOwner {
        whitelist[user] = false;
    }
    
    function setTarget(address target, bool accept) external onlyOwner {
        acceptedTargets[target] = accept;
        emit TargetAccepted(target);
    }
    
    // Simplified GSN paymaster interface
    function preRelayedCall(bytes memory) external pure returns (bytes memory) {
        return "";
    }
    
    function postRelayedCall(
        bytes memory,
        bool,
        uint256,
        uint256
    ) external {}
    
    // FIXED: Add payable receive function
    receive() external payable {
        emit ReceivedETH(msg.sender, msg.value);
    }
    
    // Allow owner to withdraw funds (for testing)
    function withdraw(uint256 amount) external onlyOwner {
        payable(owner).transfer(amount);
    }
    
    // Check contract balance
    function getBalance() external view returns (uint256) {
        return address(this).balance;
    }
}