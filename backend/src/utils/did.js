// backend/src/utils/did.js
import { ethers } from "ethers";
const  { isAddress }  = ethers;

/**
 * Normalize DID or Ethereum address to lowercase 0x-address.
 * Returns null if invalid.
 */
export const didToAddress = (didOrAddress) => {
  if (!didOrAddress) return null;

  let addr = didOrAddress;

  // Extract last DID segment if present
  if (addr.startsWith("did:")) {
    const parts = addr.split(":");
    addr = parts[parts.length - 1];
  }

  // Enforce Ethereum address validity
  if (!isAddress(addr)) {
    return null;
  }

  return addr.toLowerCase();
};

/**
 * Strict variant: throws 400 error if invalid
 */
export const requireDidAddress = (value, label = "DID") => {
  const addr = didToAddress(value);
  if (!addr) {
    const err = new Error(`Invalid ${label}`);
    err.status = 400;
    throw err;
  }
  return addr;
};
