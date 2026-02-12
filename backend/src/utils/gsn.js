import {JsonRpcProvider } from "ethers";
import { ethers } from "ethers";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const contractData = JSON.parse(
  fs.readFileSync(
    path.join(__dirname, "../contractDataGSN.json"),
    "utf-8"
  )
);

// --- 1️⃣ Provider ---
const provider = new JsonRpcProvider(
  process.env.SEPOLIA_RPC_URL
);

// --- 2️⃣ Relayer Wallet (this pays gas) ---
export function getRelayerSigner() {
  if (!process.env.PRIVATE_KEY) {
    throw new Error("PRIVATE_KEY not set");
  }

  return new ethers.Wallet(
    process.env.PRIVATE_KEY,
    provider
  );
}

// --- 3️⃣ Forwarder Contract ---
export function getForwarder() {
  const forwarderAbi = [
    "function execute((address from,address to,uint256 value,uint256 gas,uint256 nonce,bytes data),bytes signature) payable returns (bool,bytes)",
    "function getNonce(address from) view returns (uint256)"
  ];

  return new ethers.Contract(
    contractData.forwarderAddress,
    forwarderAbi,
    provider
  );
}
