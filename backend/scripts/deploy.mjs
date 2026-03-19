// Import Hardhat package (ESM-compatible)
import pkg from "hardhat";

// Node.js file system module (used to write contract data to file)
import fs from "fs";

// Path utilities for resolving file paths
import path from "path";

// Utility to work with ES module file paths
import { fileURLToPath } from "url";

// Extract ethers from Hardhat package
const { ethers } = pkg;

// Get current directory (ES modules do not have __dirname by default)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Main deployment function
async function main() {
  // Get the deployer account (first signer from Hardhat)
  const [deployer] = await ethers.getSigners();

  // Log which account is being used for deployment
  console.log("Deploying contracts with:", deployer.address);

  // Load the compiled contract factory for IdentityRegistry
  const IdentityRegistry = await ethers.getContractFactory("IdentityRegistry");

  // Deploy the contract to the blockchain
  const registry = await IdentityRegistry.deploy();

  // Wait until deployment is fully confirmed
  await registry.waitForDeployment();

  // Retrieve deployed contract address
  const address = await registry.getAddress();

  // Log deployed contract address
  console.log("IdentityRegistry deployed to:", address);

  // Prepare contract data object for backend usage
  const contractData = {
    address, // Deployed contract address
    abi: JSON.parse(registry.interface.formatJson()) // ABI (Application Binary Interface)
  };

  // Define output path:
  // root/backend/src/contractData.json
  const outputPath = path.join(__dirname, "..",  "src", "contractData.json");

  // Write contract data to file (pretty formatted JSON)
  fs.writeFileSync(outputPath, JSON.stringify(contractData, null, 2));

  // Log where contract data has been saved
  console.log("Contract data written to:", outputPath);
}

// Execute deployment script and handle errors
main().catch((err) => {
  console.error(err); // Log any deployment errors
  process.exitCode = 1; // Exit process with failure code
});