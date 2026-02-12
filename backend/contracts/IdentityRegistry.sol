// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title IdentityRegistry - Minimal ERC-725 like identity registry
/// @notice Allows owners to register an IPFS CID for their profile and set simple claims.
contract IdentityRegistry {
    // owner -> ipfs cid (profile)
    mapping(address => string) private _profileCID;

    // owner -> claimId -> claimHash (bytes32)
    mapping(address => mapping(bytes32 => bytes32)) private _claims;

    event ProfileSet(address indexed owner, string cid);
    event ClaimSet(address indexed owner, bytes32 indexed claimId, bytes32 claimHash);
    event ClaimRemoved(address indexed owner, bytes32 indexed claimId);

    // CHANGED: New modifier — only the profile owner can update their data
    modifier onlySelf(address subject) {
        require(msg.sender == subject, "Not the profile owner");
        _;
    }

    /// @notice Register a new identity (shortcut for setting your profile CID)
    function registerIdentity(string calldata cid) external {
        _profileCID[msg.sender] = cid;
        emit ProfileSet(msg.sender, cid);
    }

    /// @notice set profile CID (e.g., IPFS CID linking to encrypted profile)
    function setProfileCID(address owner, string calldata cid) external onlySelf(owner) {
        _profileCID[owner] = cid;
        emit ProfileSet(owner, cid);
    }

    /// @notice get profile CID
    function getProfileCID(address owner) external view returns (string memory) {
        return _profileCID[owner];
    }

    /// @notice set a claim for an owner (claimId is an identifier, claimHash is hash of claim payload)
    function setClaim(address owner, bytes32 claimId, bytes32 claimHash) external onlySelf(owner) {
        _claims[owner][claimId] = claimHash;
        emit ClaimSet(owner, claimId, claimHash);
    }

    /// @notice remove a claim
    function removeClaim(address owner, bytes32 claimId) external onlySelf(owner) {
        delete _claims[owner][claimId];
        emit ClaimRemoved(owner, claimId);
    }

    /// @notice read claim hash
    function getClaim(address owner, bytes32 claimId) external view returns (bytes32) {
        return _claims[owner][claimId];
    }
}