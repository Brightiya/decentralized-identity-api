// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/metatx/ERC2771Context.sol";

contract IdentityRegistryMeta is ERC2771Context {

    // owner -> ipfs cid (profile)
    mapping(address => string) private _profileCID;

    // owner -> claimId -> claimHash (bytes32)
    mapping(address => mapping(bytes32 => bytes32)) private _claims;

    event ProfileSet(address indexed owner, string cid);
    event ClaimSet(address indexed owner, bytes32 indexed claimId, bytes32 claimHash);
    event ClaimRemoved(address indexed owner, bytes32 indexed claimId);
    event IdentityRegistered(address indexed owner, string cid);

    constructor(address trustedForwarder)
        ERC2771Context(trustedForwarder)
    {}

    modifier onlySelf(address subject) {
        require(_msgSender() == subject, "Not the profile owner");
        _;
    }

    function registerIdentity(string calldata cid) external {
        _profileCID[_msgSender()] = cid;
        emit ProfileSet(_msgSender(), cid);
        emit IdentityRegistered(_msgSender(), cid);
    }

    function setProfileCID(address owner, string calldata cid)
        external
        onlySelf(owner)
    {
        _profileCID[owner] = cid;
        emit ProfileSet(owner, cid);
    }

    function getProfileCID(address owner)
        external
        view
        returns (string memory)
    {
        return _profileCID[owner];
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
        emit ClaimSet(owner, claimId, claimHash);
    }

    function removeClaim(address owner, bytes32 claimId)
        external
        onlySelf(owner)
    {
        delete _claims[owner][claimId];
        emit ClaimRemoved(owner, claimId);
    }

    function getClaim(address owner, bytes32 claimId)
        external
        view
        returns (bytes32)
    {
        return _claims[owner][claimId];
    }

    function hasProfile(address owner)
        external
        view
        returns (bool)
    {
        return bytes(_profileCID[owner]).length > 0;
    }

    // Required override for Solidity multiple inheritance
    function _msgSender()
        internal
        view
        override
        returns (address)
    {
        return  ERC2771Context._msgSender();
    }

    function _msgData()
        internal
        view
        override
        returns (bytes calldata)
    {
        return ERC2771Context._msgData();
    }

    receive() external payable {}
}
