import hre from "hardhat";

async function main() {
  console.log("Deploying contracts...");

  const { ethers } = hre;

  const [deployer] = await ethers.getSigners();
  console.log("Deployer:", deployer.address);

  // Deploy Forwarder
  const Forwarder = await ethers.getContractFactory("Forwarder");
  const forwarder = await Forwarder.deploy();
  await forwarder.waitForDeployment();

  const forwarderAddress = await forwarder.getAddress();
  console.log("Forwarder deployed to:", forwarderAddress);

  // Deploy IdentityRegistryMeta
  const IdentityRegistryMeta = await ethers.getContractFactory("IdentityRegistryMeta");
  const registry = await IdentityRegistryMeta.deploy(forwarderAddress);
  await registry.waitForDeployment();

  const registryAddress = await registry.getAddress();
  console.log("IdentityRegistryMeta deployed to:", registryAddress);

  console.log("✅ Deployment complete.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
