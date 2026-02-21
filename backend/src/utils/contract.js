// backend/src/utils/contract.js
import { ethers } from "ethers";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { getProvider } from "../eth/provider.js";

// ────────────────────────────────────────────────
// Load contract artifacts
// ────────────────────────────────────────────────
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 🔒 We still load both for safety/backward compatibility
const normalPath = path.resolve(
  __dirname,
  "../../artifacts/contracts/IdentityRegistry.sol/IdentityRegistry.json"
);

const metaPath = path.resolve(
  __dirname,
  "../../artifacts/contracts/IdentityRegistryMeta.sol/IdentityRegistryMeta.json"
);

let normalContractData;
let metaContractData;

try {
  normalContractData = JSON.parse(fs.readFileSync(normalPath, "utf8"));
  metaContractData = JSON.parse(fs.readFileSync(metaPath, "utf8"));
} catch (err) {
  console.error("Artifact load failed:", err.message);
  console.error("Normal path:", normalPath);
  console.error("Meta path:", metaPath);
  process.exit(1);
}

let _provider;
const _contracts = {};

// ────────────────────────────────────────────────
// Provider
// ────────────────────────────────────────────────
function getLazyProvider() {
  if (process.env.NODE_ENV === "test") return null;

  if (!_provider) {
    _provider = getProvider();
  }
  return _provider;
}

// ────────────────────────────────────────────────
// Hybrid mode
// ────────────────────────────────────────────────
export function isHybridMode() {
  const hybrid = process.env.HYBRID_MODE || process.env.HYBRID_SIGNING;
  return hybrid === "true" || hybrid === "1";
}

// ────────────────────────────────────────────────
// Contract getter (TEST SAFE)
// ────────────────────────────────────────────────
export function getContract(mode = "normal") {
  if (process.env.NODE_ENV === "test") {
    if (!globalThis.mockContract) {
      throw new Error("Mock contract not registered");
    }
    return globalThis.mockContract;
  }

  // 🔒 IMPORTANT FIX:
  // Always resolve to META contract internally
  const resolvedMode = "meta";

  if (_contracts[resolvedMode]) return _contracts[resolvedMode];

  const provider = getLazyProvider();
  if (!provider) {
    throw new Error("Provider not available");
  }

  const address = process.env.IDENTITY_REGISTRY_META_ADDRESS;

  if (!address) {
    throw new Error("IDENTITY_REGISTRY_META_ADDRESS missing in env");
  }

  const abi = metaContractData.abi;

  if (isHybridMode()) {
    _contracts[resolvedMode] = new ethers.Contract(
      address,
      abi,
      provider
    );
  } else {
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

export default getContract;

// ────────────────────────────────────────────────
// Prepare unsigned tx (BACKWARD COMPATIBLE)
// ────────────────────────────────────────────────
export async function prepareUnsignedTx(...params) {
  let mode = "normal";
  let methodName;
  let args;

  // Backward compatible parsing
  if (
    params.length >= 2 &&
    (params[0] === "gasless" || params[0] === "normal")
  ) {
    mode = params[0];
    methodName = params[1];
    args = params.slice(2);
  } else {
    methodName = params[0];
    args = params.slice(1);
  }

  // 🔒 IMPORTANT FIX:
  // Always encode using META contract
  const address = process.env.IDENTITY_REGISTRY_META_ADDRESS;

  if (!address) {
    throw new Error("IDENTITY_REGISTRY_META_ADDRESS missing in env");
  }

  const iface = new ethers.Interface(metaContractData.abi);

  if (!iface.getFunction(methodName)) {
    throw new Error(`Method '${methodName}' not found in ABI`);
  }

  const encoded = iface.encodeFunctionData(methodName, args);

  return {
    to: address,
    data: encoded,
    chainId: Number(process.env.CHAIN_ID || 84532),
    value: "0x0",
  };
}

// ────────────────────────────────────────────────
// Convenience wrappers (UNCHANGED)
// ────────────────────────────────────────────────
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