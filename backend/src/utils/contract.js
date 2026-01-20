// backend/src/utils/contract.js
import { ethers } from "ethers";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

dotenv.config();

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

// Provider from env (default local Hardhat)
const provider = new ethers.JsonRpcProvider(
  process.env.PROVIDER_URL || "http://127.0.0.1:8545"
);

// Hybrid mode check
export function isHybridMode() {
  return process.env.HYBRID_SIGNING === "true";
}

// Create contract instance synchronously
let contract;
if (isHybridMode()) {
  contract = new ethers.Contract(contractData.address, contractData.abi, provider);
  console.log("Hybrid mode enabled: Contract is read-only (frontend signs txs)");
} else {
  const privateKey = process.env.PRIVATE_KEY;
  if (!privateKey) {
    throw new Error("❌ Missing PRIVATE_KEY in .env for dev mode");
  }
  const signer = new ethers.Wallet(privateKey, provider);
  contract = new ethers.Contract(contractData.address, contractData.abi, signer);
  console.log("Dev mode enabled: Backend signing with PRIVATE_KEY");
}

// Export contract for controllers
export default contract;

/**
 * Prepare unsigned transaction for any contract method
 * @param {string} methodName - Contract method (e.g. 'setProfileCID', 'setClaim')
 * @param {any[]} args - Method arguments
 * @returns {Promise<object>} Unsigned tx data for frontend to sign/send
 */
export async function prepareUnsignedTx(methodName, ...args) {
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