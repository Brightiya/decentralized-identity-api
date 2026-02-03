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
const contractPath = path.resolve(__dirname, "../contractData.json");
let contractData;
try {
  contractData = JSON.parse(fs.readFileSync(contractPath, "utf8"));
} catch (err) {
  console.error("Failed to load contractData.json:", err);
  process.exit(1);
}

let _provider;
let _contract;

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
export function getContract() {
  // In test mode → return the mock directly (set by setup-contract-mock.js)
  if (process.env.NODE_ENV === "test") {
    if (!globalThis.mockContract) {
      throw new Error(
        "Mock contract not registered — check setup-contract-mock.js"
      );
    }
    return globalThis.mockContract;
  }

  if (_contract) return _contract;

  const provider = getLazyProvider();
  if (!provider) {
    throw new Error("Provider not available in this mode");
  }

  if (isHybridMode()) {
    _contract = new ethers.Contract(
      contractData.address,
      contractData.abi,
      provider
    );
  } else {
    const privateKey = process.env.PRIVATE_KEY;
    if (!privateKey) {
      throw new Error("❌ Missing PRIVATE_KEY in dev mode");
    }

    const signer = new ethers.Wallet(privateKey, provider);
    _contract = new ethers.Contract(
      contractData.address,
      contractData.abi,
      signer
    );
  }

  return _contract;
}

/**
 * Default export for backward compatibility
 */
export default getContract;

/**
 * Prepare unsigned transaction — provider-free in hybrid mode
 */
export async function prepareUnsignedTx(methodName, ...args) {
  // Load contract data (ABI + address) — no provider needed here
  const contractData = JSON.parse(
    fs.readFileSync(path.resolve(__dirname, "../contractData.json"), "utf8")
  );

  const iface = new ethers.Interface(contractData.abi);
  const data = iface.encodeFunctionData(methodName, args);

  if (isHybridMode()) {
    // Hybrid mode: return minimal unsigned tx object — frontend will sign/send
    return {
      to: contractData.address,
      data,
      chainId: Number(process.env.CHAIN_ID || 31337),
      gasLimit: "0x" + (500000).toString(16), // safe upper bound — frontend can estimate
      value: "0x0",
      type: 2,
      // Optional: add nonce, maxFeePerGas etc. if you want to pre-fill
    };
  }

  // Non-hybrid mode: full provider + signer
  const provider = getLazyProvider();
  if (!provider) {
    throw new Error("Provider required in non-hybrid mode");
  }

  const contract = new ethers.Contract(
    contractData.address,
    contractData.abi,
    provider
  );

  const fn = contract.getFunction(methodName);
  if (!fn) {
    throw new Error(`Method '${methodName}' not found in ABI`);
  }

  const tx = await fn.populateTransaction(...args);

  const feeData = await provider.getFeeData();
  const chain = await provider.getNetwork();

  return {
    to: contract.target,
    data: tx.data,
    chainId: Number(chain.chainId),
    gasLimit: (tx.gasLimit || 500000n).toString(),
    maxFeePerGas: (feeData.maxFeePerGas || 0n).toString(),
    maxPriorityFeePerGas: (feeData.maxPriorityFeePerGas || 0n).toString(),
    value: "0",
    type: 2,
  };
}

// Convenience wrappers (unchanged)
export async function prepareUnsignedSetClaim(subjectAddress, claimIdBytes32, claimHash) {
  return prepareUnsignedTx("setClaim", subjectAddress, claimIdBytes32, claimHash);
}

export async function prepareUnsignedSetProfileCID(subjectAddress, cid) {
  return prepareUnsignedTx("setProfileCID", subjectAddress, cid);
}