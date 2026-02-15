// backend/src/utils/contract.js
import { ethers } from "ethers";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { getProvider } from "../eth/provider.js";

// ────────────────────────────────────────────────
// Load contract data synchronously
// ────────────────────────────────────────────────
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const normalPath = path.resolve(__dirname, "/Users/brighto.yahen/Downloads/decentralized-identity-api-main/backend/artifacts/contracts/IdentityRegistry.sol/IdentityRegistry.json");
const metaPath = path.resolve(__dirname, "/Users/brighto.yahen/Downloads/decentralized-identity-api-main/backend/artifacts/contracts/IdentityRegistryMeta.sol/IdentityRegistryMeta.json");
let normalContractData;
let metaContractData;

try {
  normalContractData = JSON.parse(fs.readFileSync(normalPath, "utf8"));
  metaContractData = JSON.parse(fs.readFileSync(metaPath, "utf8"));
} catch (err) {
  console.error("Failed to load contract artifacts:", err);
  process.exit(1);
}

let _provider;
//let _contract;

/**
 * Lazy provider getter — skip real creation in test mode
 */
function getLazyProvider() {
  // In test mode → mocks handle everything, no real provider needed
  if (process.env.NODE_ENV === "test") {
    return null; // or return a dummy object if needed
  }

  if (!_provider) {
    _provider = getProvider();
  }
  return _provider;
}

/**
 * Hybrid mode check
 */
export function isHybridMode() {
  const hybrid = process.env.HYBRID_MODE || process.env.HYBRID_SIGNING;
  return hybrid === "true" || hybrid === "1";
}

/**
 * Lazy contract getter — fully mocked in test mode
 */
export function getContract(mode = "normal") {
  if (process.env.NODE_ENV === "test") {
    if (!globalThis.mockContract) {
      throw new Error("Mock contract not registered");
    }
    return globalThis.mockContract;
  }

  const provider = getLazyProvider();
  if (!provider) {
    throw new Error("Provider not available");
  }

  const data =
    mode === "gasless"
      ? metaContractData
      : normalContractData;

  if (isHybridMode()) {
    return new ethers.Contract(
      data.address,
      data.abi,
      provider
    );
  }

  const privateKey = process.env.PRIVATE_KEY;
  if (!privateKey) {
    throw new Error("Missing PRIVATE_KEY");
  }

  const signer = new ethers.Wallet(privateKey, provider);

  return new ethers.Contract(
    data.address,
    data.abi,
    signer
  );
}


/**
 * Default export for backward compatibility
 */
export default getContract;

/**
 * Prepare unsigned transaction — provider-free in hybrid mode
 */
// ────────────────────────────────────────────────
// Prepare unsigned transaction (gasless compatible)
// ────────────────────────────────────────────────
export  async function prepareUnsignedTx(mode, methodName, ...args) {
  const data =
    mode === "gasless"
      ? metaContractData
      : normalContractData;

  const iface = new ethers.Interface(data.abi);

  if (!iface.getFunction(methodName)) {
    throw new Error(`Method '${methodName}' not found in ABI`);
  }

  const encoded = iface.encodeFunctionData(methodName, args);

  return {
    to: data.address,
    data: encoded,
    chainId: Number(process.env.CHAIN_ID),
    value: "0x0",
  };
}



// Convenience wrappers (unchanged)
export async function prepareUnsignedSetClaim(subjectAddress, claimIdBytes32, claimHash) {
  return prepareUnsignedTx("setClaim", subjectAddress, claimIdBytes32, claimHash);
}

export async function prepareUnsignedSetProfileCID(subjectAddress, cid) {
  return prepareUnsignedTx("setProfileCID", subjectAddress, cid);
}