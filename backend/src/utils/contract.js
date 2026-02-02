// backend/src/utils/contract.js
import { ethers } from "ethers";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { getProvider } from "../eth/provider.js";


// Allow __dirname in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load contract data synchronously
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
 * Lazy provider getter
 */
function getLazyProvider() {
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
 * Lazy contract getter
 */
export function getContract() {
  if (_contract) return _contract;

  const provider = getLazyProvider();

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
 * (tests & older imports rely on this)
 */
export default getContract();

/**
 * Prepare unsigned transaction for any contract method
 * @param {string} methodName - Contract method (e.g. 'setProfileCID', 'setClaim')
 * @param {any[]} args - Method arguments
 * @returns {Promise<object>} Unsigned tx data for frontend to sign/send
 */
export async function prepareUnsignedTx(methodName, ...args) {
    const contract = getContract();
    const provider = getLazyProvider();
  if (!contract) {
    throw new Error("Contract not initialized - check server startup logs");
  }

  // Ensure ABI has the function
  const fn = contract.getFunction(methodName);
  if (!fn) {
    throw new Error(`Method '${methodName}' does not exist in contract ABI`);
  }

  // Populate transaction (works without signer in hybrid mode)
  const tx = await fn.populateTransaction(...args);

  const feeData = await provider.getFeeData();
  const chain = await provider.getNetwork();

  // We deliberately DO NOT set nonce in hybrid mode
  // → Let the frontend / ethers.js query the current pending nonce at the moment of signing
  const nonce = isHybridMode() ? undefined : "0"; // only fallback for non-hybrid

  // Convert BigInts → strings for JSON compatibility
  const unsignedTx = {
    to: contract.target,
    data: tx.data,
    chainId: Number(chain.chainId),
    // nonce: intentionally omitted in hybrid mode
    gasLimit: (tx.gasLimit || 400000n).toString(), // increased default a bit
    maxFeePerGas: (feeData.maxFeePerGas || 0n).toString(),
    maxPriorityFeePerGas: (feeData.maxPriorityFeePerGas || 0n).toString(),
    value: "0",
    type: 2,
  };

  // Only include nonce if we're in dev mode (backend signing)
  if (!isHybridMode() && nonce !== undefined) {
    unsignedTx.nonce = nonce;
  }

  console.log(`[prepareUnsignedTx] Prepared tx for ${methodName}:`, {
    to: unsignedTx.to,
    nonce: unsignedTx.nonce ?? "(let frontend resolve)",
    gasLimit: unsignedTx.gasLimit,
  });

  return unsignedTx;
}

/**
 * Convenience wrapper: Prepare unsigned tx for setClaim
 */
export async function prepareUnsignedSetClaim(subjectAddress, claimIdBytes32, claimHash) {
  return prepareUnsignedTx("setClaim", subjectAddress, claimIdBytes32, claimHash);
}

/**
 * Convenience wrapper: Prepare unsigned tx for setProfileCID
 */
export async function prepareUnsignedSetProfileCID(subjectAddress, cid) {
  return prepareUnsignedTx("setProfileCID", subjectAddress, cid);
}

