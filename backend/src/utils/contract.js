// backend/src/utils/contract.js
import { ethers } from "ethers";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// Allow __dirname in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load contract data
const contractPath = path.resolve(__dirname, "../contractData.json");
const contractData = JSON.parse(fs.readFileSync(contractPath));

// Connect to local Hardhat node
const provider = new ethers.JsonRpcProvider("http://127.0.0.1:8545");

// Use the first Hardhat account as signer (for testing)
const signer = new ethers.Wallet(
  "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80", // Account #0 private key
  provider
);

// Create contract instance
const contract = new ethers.Contract(contractData.address, contractData.abi, signer);

export default contract;
