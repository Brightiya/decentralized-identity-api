// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20; // Specifies the Solidity compiler version (compatible with 0.8.20 and above)

import "@openzeppelin/contracts/metatx/ERC2771Forwarder.sol"; 
// Imports OpenZeppelin's ERC2771Forwarder contract for handling meta-transactions

contract Forwarder is ERC2771Forwarder {
    // Declares a contract named Forwarder that inherits from ERC2771Forwarder

    constructor() ERC2771Forwarder("Forwarder") {}
    // Constructor that initializes the parent ERC2771Forwarder contract
    // Passes the string "Forwarder" as the name identifier for the forwarder
}