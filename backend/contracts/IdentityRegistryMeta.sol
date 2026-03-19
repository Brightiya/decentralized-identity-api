// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20; // Specifies the Solidity compiler version (compatible with 0.8.20 and above)

import "@openzeppelin/contracts/metatx/ERC2771Context.sol";
// Imports OpenZeppelin's ERC2771Context to support meta-transactions (trusted forwarder pattern)

contract IdentityRegistryMeta is ERC2771Context {
    // Contract extends ERC2771Context to enable gasless transactions via a trusted forwarder

    // owner -> ipfs cid (profile)
    mapping(address => string) private _profileCID;
    // Stores mapping from user address to their profile CID (e.g., IPFS link)

    // owner -> claimId -> claimHash (bytes32)
    mapping(address => mapping(bytes32 => bytes32)) private _claims;
    // Nested mapping:
    // - owner address => claimId => claimHash

    event ProfileSet(address indexed owner, string cid);
    // Emitted when a profile CID is set or updated

    event ClaimSet(address indexed owner, bytes32 indexed claimId, bytes32 claimHash);
    // Emitted when a claim is created or updated

    event ClaimRemoved(address indexed owner, bytes32 indexed claimId);
    // Emitted when a claim is removed

    event IdentityRegistered(address indexed owner, string cid);
    // Emitted when a new identity is registered

    constructor(address trustedForwarder)
        ERC2771Context(trustedForwarder)
    {}
    // Constructor initializes ERC2771Context with a trusted forwarder address

    modifier onlySelf(address subject) {
        require(_msgSender() == subject, "Not the profile owner");
        // Ensures only the profile owner (resolved via meta-tx aware _msgSender) can modify data
        _;
    }

    function registerIdentity(string calldata cid) external {
        _profileCID[_msgSender()] = cid;
        // Stores profile CID for the caller (supports relayed sender)

        emit ProfileSet(_msgSender(), cid);
        // Emits profile set event

        emit IdentityRegistered(_msgSender(), cid);
        // Emits additional event specifically for identity registration
    }

    function setProfileCID(address owner, string calldata cid)
        external
        onlySelf(owner)
    {
        _profileCID[owner] = cid;
        // Updates profile CID for the owner (must be caller)

        emit ProfileSet(owner, cid);
        // Emits event for profile update
    }

    function getProfileCID(address owner)
        external
        view
        returns (string memory)
    {
        return _profileCID[owner];
        // Returns the stored profile CID for a given owner
    }

    function setClaim(
        address owner,
        bytes32 claimId,
        bytes32 claimHash
    )
        external
        onlySelf(owner)
    {
        _claims[owner][claimId] = claimHash;
        // Stores or updates a claim hash for the given owner and claimId

        emit ClaimSet(owner, claimId, claimHash);
        // Emits event for claim creation/update
    }

    function removeClaim(address owner, bytes32 claimId)
        external
        onlySelf(owner)
    {
        delete _claims[owner][claimId];
        // Deletes the claim associated with the claimId

        emit ClaimRemoved(owner, claimId);
        // Emits event for claim removal
    }

    function getClaim(address owner, bytes32 claimId)
        external
        view
        returns (bytes32)
    {
        return _claims[owner][claimId];
        // Returns the claim hash for a given owner and claimId
    }

    function hasProfile(address owner)
        external
        view
        returns (bool)
    {
        return bytes(_profileCID[owner]).length > 0;
        // Returns true if the owner has a non-empty profile CID
    }

    // Required override for Solidity multiple inheritance
    function _msgSender()
        internal
        view
        override
        returns (address)
    {
        return  ERC2771Context._msgSender();
        // Returns the correct sender (handles meta-transactions via forwarder)
    }

    function _msgData()
        internal
        view
        override
        returns (bytes calldata)
    {
        return ERC2771Context._msgData();
        // Returns the correct calldata (strips appended sender if relayed)
    }

    receive() external payable {}
    // Allows the contract to receive ETH directly
}