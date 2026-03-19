import { ethers } from "ethers"; // Ethereum library for interacting with smart contracts
import fs from "fs"; // File system module to read contract artifacts
import path from "path"; // Path utilities for resolving file locations
import { fileURLToPath } from "url"; // Required for ES module __dirname equivalent
import { getProvider } from "../eth/provider.js"; // Custom provider factory

// ────────────────────────────────────────────────
// Load contract artifacts
// ────────────────────────────────────────────────

// Recreate __filename and __dirname in ES module context
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 🔒 Load compiled contract artifacts (ABI + metadata)
// Standard contract (legacy / fallback)
const normalPath = path.resolve(
  __dirname,
  "../../artifacts/contracts/IdentityRegistry.sol/IdentityRegistry.json"
);

// Meta-transaction enabled contract (primary)
const metaPath = path.resolve(
  __dirname,
  "../../artifacts/contracts/IdentityRegistryMeta.sol/IdentityRegistryMeta.json"
);


let metaContractData;

// Read and parse contract JSON artifacts
try {
  
  metaContractData = JSON.parse(fs.readFileSync(metaPath, "utf8"));
} catch (err) {
  // Fail fast if artifacts are missing or corrupted
  console.error("Artifact load failed:", err.message);
  console.error("Normal path:", normalPath);
  console.error("Meta path:", metaPath);
  process.exit(1);
}

// Cached provider and contract instances (singleton pattern)
let _provider;
const _contracts = {};

// ────────────────────────────────────────────────
// Provider
// ────────────────────────────────────────────────

// Lazy initialization of blockchain provider
function getLazyProvider() {
  // Disable provider usage in test environment
  if (process.env.NODE_ENV === "test") return null;

  // Initialize provider only once
  if (!_provider) {
    _provider = getProvider();
  }
  return _provider;
}

// ────────────────────────────────────────────────
// Hybrid mode
// ────────────────────────────────────────────────

// Determines whether signing is done on frontend (hybrid) or backend
export function isHybridMode() {
  const hybrid = process.env.HYBRID_MODE || process.env.HYBRID_SIGNING;
  return hybrid === "true" || hybrid === "1";
}

// ────────────────────────────────────────────────
// Contract getter (TEST SAFE)
// ────────────────────────────────────────────────

// Returns contract instance (mocked in tests, real in runtime)
export function getContract(mode = "normal") {
  // In test mode, return globally mocked contract
  if (process.env.NODE_ENV === "test") {
    if (!globalThis.mockContract) {
      throw new Error("Mock contract not registered");
    }
    return globalThis.mockContract;
  }

  // Force use of META contract regardless of input mode
  const resolvedMode = "meta";

  // Return cached instance if already created
  if (_contracts[resolvedMode]) return _contracts[resolvedMode];

  const provider = getLazyProvider();
  if (!provider) {
    throw new Error("Provider not available");
  }

  // Contract address from environment configuration
  const address = process.env.IDENTITY_REGISTRY_META_ADDRESS;

  if (!address) {
    throw new Error("IDENTITY_REGISTRY_META_ADDRESS missing in env");
  }

  const abi = metaContractData.abi;

  // Hybrid mode: read-only contract (frontend signs transactions)
  if (isHybridMode()) {
    _contracts[resolvedMode] = new ethers.Contract(
      address,
      abi,
      provider
    );
  } else {
    // Backend signing mode: requires private key
    const privateKey = process.env.PRIVATE_KEY;
    if (!privateKey) {
      throw new Error("Missing PRIVATE_KEY");
    }

    const signer = new ethers.Wallet(privateKey, provider);

    _contracts[resolvedMode] = new ethers.Contract(
      address,
      abi,
      signer
    );
  }

  return _contracts[resolvedMode];
}

// Default export for convenience
export default getContract;

// ────────────────────────────────────────────────
// Prepare unsigned tx (BACKWARD COMPATIBLE)
// ────────────────────────────────────────────────

// Builds unsigned transaction payload for frontend signing or relayer usage
export async function prepareUnsignedTx(...params) {
  let mode = "normal";
  let methodName;
  let args;

  // Backward compatibility: detect if mode is explicitly passed
  if (
    params.length >= 2 &&
    (params[0] === "gasless" || params[0] === "normal")
  ) {
    mode = params[0];
    methodName = params[1];
    args = params.slice(2);
  } else {
    // Default: first argument is method name
    methodName = params[0];
    args = params.slice(1);
  }

  // Always encode transaction using META contract ABI
  const address = process.env.IDENTITY_REGISTRY_META_ADDRESS;

  if (!address) {
    throw new Error("IDENTITY_REGISTRY_META_ADDRESS missing in env");
  }

  // Create interface from ABI for encoding function calls
  const iface = new ethers.Interface(metaContractData.abi);

  // Validate that function exists in ABI
  if (!iface.getFunction(methodName)) {
    throw new Error(`Method '${methodName}' not found in ABI`);
  }

  // Encode function call with arguments
  const encoded = iface.encodeFunctionData(methodName, args);

  // Return unsigned transaction object
  return {
    to: address,
    data: encoded,
    chainId: Number(process.env.CHAIN_ID || 84532), // Default Base Sepolia
    value: "0x0", // No ETH transfer
  };
}

// ────────────────────────────────────────────────
// Convenience wrappers
// ────────────────────────────────────────────────

// Helper to prepare transaction for setting a claim
export async function prepareUnsignedSetClaim(
  subjectAddress,
  claimIdBytes32,
  claimHash
) {
  return prepareUnsignedTx(
    "setClaim",
    subjectAddress,
    claimIdBytes32,
    claimHash
  );
}

// Helper to prepare transaction for setting profile CID
export async function prepareUnsignedSetProfileCID(
  subjectAddress,
  cid
) {
  return prepareUnsignedTx(
    "setProfileCID",
    subjectAddress,
    cid
  );
}