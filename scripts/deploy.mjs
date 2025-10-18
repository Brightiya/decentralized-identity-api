// scripts/deploy.mjs
import pkg from "hardhat";
import fs from "fs";

const { ethers } = pkg;

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("🚀 Deploying contracts with:", deployer.address);

  const IdentityRegistry = await ethers.getContractFactory("IdentityRegistry");
  const registry = await IdentityRegistry.deploy();
  await registry.waitForDeployment();

  const address = await registry.getAddress();
  console.log("✅ IdentityRegistry deployed to:", address);

  // Save contract data for backend
  const contractData = {
    address,
    abi: JSON.parse(registry.interface.formatJson())
  };

  fs.writeFileSync("./backend/src/contractData.json", JSON.stringify(contractData, null, 2));
  console.log("📝 Contract data written to backend/src/contractData.json");
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
