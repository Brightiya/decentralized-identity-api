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

// Load contract data
const contractPath = path.resolve(__dirname, "../contractData.json");
let contractData;
try {
  contractData = JSON.parse(fs.readFileSync(contractPath));
} catch (err) {
  console.error("Failed to load contractData.json:", err);
  process.exit(1);
}

// Provider from env (default local Hardhat)
const provider = new ethers.JsonRpcProvider(process.env.PROVIDER_URL || "http://127.0.0.1:8545");

// Hybrid mode check
export function isHybridMode() {
  return process.env.HYBRID_SIGNING === 'true';
}

// Create contract instance
let contract;
if (isHybridMode()) {
  // Production/hybrid: read-only contract (frontend signs txs)
  contract = new ethers.Contract(contractData.address, contractData.abi, provider);
  console.log('Hybrid mode enabled: Contract is read-only (frontend will sign transactions)');
} else {
  // Dev mode: backend signs with PRIVATE_KEY
  const privateKey = process.env.PRIVATE_KEY;
  if (!privateKey) {
    throw new Error("❌ Missing PRIVATE_KEY in .env for dev mode (HYBRID_SIGNING=false)");
  }

  const signer = new ethers.Wallet(privateKey, provider);
  contract = new ethers.Contract(contractData.address, contractData.abi, signer);
  console.log('Dev mode enabled: Backend signing with PRIVATE_KEY');
}

export default contract;

/**
 * Prepare unsigned transaction for any contract method
 * @param {string} methodName - Contract method (e.g. 'setProfileCID', 'setClaim')
 * @param {any[]} args - Method arguments
 * @returns {Promise<object>} Unsigned tx data for frontend to sign/send
 */
export async function prepareUnsignedTx(methodName, ...args) {
  if (typeof contract[methodName] !== 'function') {
    throw new Error(`Method '${methodName}' does not exist on contract`);
  }

  const tx = await contract.populateTransaction[methodName](...args);

  const feeData = await provider.getFeeData();

  // Safely estimate nonce (try to find address arg, default to 0)
  let nonce = 0n;
  const subjectAddress = args.find(arg => typeof arg === 'string' && ethers.isAddress(arg));
  if (subjectAddress) {
    nonce = await provider.getTransactionCount(subjectAddress);
  } else {
    console.warn(`Could not determine nonce - using 0 (may need manual adjustment)`);
  }

  return {
    to: contract.target,
    data: tx.data,
    chainId: Number((await provider.getNetwork()).chainId),
    nonce,
    gasLimit: tx.gasLimit || 300000n,
    maxFeePerGas: feeData.maxFeePerGas,
    maxPriorityFeePerGas: feeData.maxPriorityFeePerGas,
    value: 0n,
    type: 2 // EIP-1559
  };
}

/**
 * Convenience wrapper: Prepare unsigned tx for setClaim
 * @param {string} subjectAddress - Address of the subject
 * @param {string} claimIdBytes32 - claimId as bytes32
 * @param {string} claimHash - keccak256 hash of the claim CID
 * @returns {Promise<object>} Unsigned tx data
 */
export async function prepareUnsignedSetClaim(subjectAddress, claimIdBytes32, claimHash) {
  return prepareUnsignedTx('setClaim', subjectAddress, claimIdBytes32, claimHash);
}

/**
 * Convenience wrapper: Prepare unsigned tx for setProfileCID
 * @param {string} subjectAddress - Address of the subject
 * @param {string} cid - IPFS CID
 * @returns {Promise<object>} Unsigned tx data
 */
export async function prepareUnsignedSetProfileCID(subjectAddress, cid) {
  return prepareUnsignedTx('setProfileCID', subjectAddress, cid);
}