import { ethers } from "ethers"; // Ethereum library used for address validation

/**
 * Normalize DID or Ethereum address to lowercase 0x-address.
 * Returns null if invalid.
 */
export const didToAddress = (didOrAddress) => {
  // Return null if input is missing or undefined
  if (!didOrAddress) return null;

  let addr = didOrAddress;

  // If input is a DID (e.g., "did:ethr:0x123..."), extract the address part
  if (addr.startsWith("did:")) {
    const parts = addr.split(":");
    addr = parts[parts.length - 1]; // Take last segment (Ethereum address)
  }

  // Validate that the extracted value is a valid Ethereum address
  if (!ethers.isAddress(addr)) {
    return null; // Return null if invalid
  }

  // Normalize to lowercase for consistency (avoids checksum/case issues)
  return addr.toLowerCase();
};

/**
 * Strict variant: throws 400 error if invalid
 */
export const requireDidAddress = (value, label = "DID") => {
  // Attempt to normalize and validate input
  const addr = didToAddress(value);

  // If invalid, throw an HTTP 400 (Bad Request) error
  if (!addr) {
    const err = new Error(`Invalid ${label}`);
    err.status = 400; // Attach status for Express error handler
    throw err;
  }

  // Return validated and normalized address
  return addr;
};