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
  console.error("Failed to load contract artifacts:", err);
  process.exit(1);
}

let _provider;
let _contract;

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

  if (_contract) return _contract;

  const provider = getLazyProvider();
  if (!provider) {
    throw new Error("Provider not available");
  }

  const data = mode === "gasless"
    ? metaContractData
    : normalContractData;

  const address =
    mode === "gasless"
      ? process.env.IDENTITY_REGISTRY_META_ADDRESS
      : process.env.IDENTITY_REGISTRY_ADDRESS;

  if (!address) {
    throw new Error("Contract address missing in env");
  }

  if (isHybridMode()) {
    _contract = new ethers.Contract(
      address,
      data.abi,
      provider
    );
  } else {
    const privateKey = process.env.PRIVATE_KEY;
    if (!privateKey) {
      throw new Error("Missing PRIVATE_KEY");
    }

    const signer = new ethers.Wallet(privateKey, provider);

    _contract = new ethers.Contract(
      address,
      data.abi,
      signer
    );
  }

  return _contract;
}

export default getContract;

// ────────────────────────────────────────────────
// Prepare unsigned tx (BACKWARD COMPATIBLE)
// ────────────────────────────────────────────────
export async function prepareUnsignedTx(...params) {
  let mode = "normal";
  let methodName;
  let args;

  // New style: (mode, methodName, ...args)
  if (
    params.length >= 2 &&
    (params[0] === "gasless" || params[0] === "normal")
  ) {
    mode = params[0];
    methodName = params[1];
    args = params.slice(2);
  } else {
    // Old style: (methodName, ...args)
    methodName = params[0];
    args = params.slice(1);
  }

  const data = mode === "gasless"
    ? metaContractData
    : normalContractData;
    const address =
    mode === "gasless"
      ? process.env.IDENTITY_REGISTRY_META_ADDRESS
      : process.env.IDENTITY_REGISTRY_ADDRESS;

    if (!address) {
      throw new Error("Contract address missing in env");
    }

  const iface = new ethers.Interface(data.abi);

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
// Convenience wrappers (unchanged behavior)
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
