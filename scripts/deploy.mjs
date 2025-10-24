// scripts/deploy.mjs
import pkg from "hardhat";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const { ethers } = pkg;

// Get current directory (ES modules)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with:", deployer.address);

  const IdentityRegistry = await ethers.getContractFactory("IdentityRegistry");
  const registry = await IdentityRegistry.deploy();
  await registry.waitForDeployment();

  const address = await registry.getAddress();
  console.log("IdentityRegistry deployed to:", address);

  // Save contract data for backend
  const contractData = {
    address,
    abi: JSON.parse(registry.interface.formatJson())
  };

  // Use absolute path: root/backend/src/contractData.json
  const outputPath = path.join(__dirname, "..", "backend", "src", "contractData.json");
  fs.writeFileSync(outputPath, JSON.stringify(contractData, null, 2));
  console.log("Contract data written to:", outputPath);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});