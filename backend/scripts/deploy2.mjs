import hre from "hardhat"; // Import Hardhat Runtime Environment (HRE)

async function main() {

  // Extract ethers.js from Hardhat environment
  const { ethers } = hre;

  // Get the deployer account (first available signer)
  const [deployer] = await ethers.getSigners();

  // Log deployer address
  console.log("Deployer:", deployer.address);

  // ────────────────────────────────────────────────
  // Deploy Forwarder contract (used for meta-transactions)
  // ────────────────────────────────────────────────

  // Get contract factory for Forwarder
  const Forwarder = await ethers.getContractFactory("Forwarder");

  // Deploy Forwarder contract
  const forwarder = await Forwarder.deploy();

  // Wait for deployment confirmation
  await forwarder.waitForDeployment();

  // Retrieve deployed Forwarder address
  const forwarderAddress = await forwarder.getAddress();

  // Log Forwarder address
  console.log("Forwarder deployed to:", forwarderAddress);

  // ────────────────────────────────────────────────
  // Deploy IdentityRegistryMeta contract
  // ────────────────────────────────────────────────

  // Get contract factory for IdentityRegistryMeta
  const IdentityRegistryMeta = await ethers.getContractFactory("IdentityRegistryMeta");

  // Deploy contract, passing Forwarder address (dependency injection)
  const registry = await IdentityRegistryMeta.deploy(forwarderAddress);

  // Wait for deployment confirmation
  await registry.waitForDeployment();

  // Retrieve deployed IdentityRegistryMeta address
  const registryAddress = await registry.getAddress();

  // Log deployed contract address
  console.log("IdentityRegistryMeta deployed to:", registryAddress);

  // Final success message
  console.log("✅ Deployment complete.");
}

// Execute deployment script and handle errors
main().catch((error) => {
  console.error(error); // Log any errors during deployment
  process.exitCode = 1; // Exit process with failure status
});