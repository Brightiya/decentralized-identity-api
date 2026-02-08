import pkg from "hardhat";

const { ethers } = pkg;

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("🧪 TESTING CONTRACT DEPLOYMENT");
  
  // Test 1: Forwarder
  console.log("\n1. Testing Forwarder deployment...");
  try {
    const Forwarder = await ethers.getContractFactory("Forwarder");
    const forwarder = await Forwarder.deploy();
    await forwarder.waitForDeployment();
    console.log("✅ Forwarder: OK");
    
    // Test ETH send
    const tx1 = await deployer.sendTransaction({
      to: await forwarder.getAddress(),
      value: ethers.parseEther("0.0001")
    });
    await tx1.wait();
    console.log("✅ Forwarder receives ETH: OK");
  } catch (error) {
    console.log("❌ Forwarder:", error.message);
  }
  
  // Test 2: Paymaster
  console.log("\n2. Testing Paymaster deployment...");
  try {
    const Paymaster = await ethers.getContractFactory("WhitelistPaymaster");
    const paymaster = await Paymaster.deploy();
    await paymaster.waitForDeployment();
    console.log("✅ Paymaster: OK");
    
    // Test ETH send
    const tx2 = await deployer.sendTransaction({
      to: await paymaster.getAddress(),
      value: ethers.parseEther("0.0001"),
      gasLimit: 100000
    });
    const receipt = await tx2.wait();
    console.log(`✅ Paymaster receives ETH: ${receipt.status === 1 ? 'OK' : 'FAILED'}`);
  } catch (error) {
    console.log("❌ Paymaster:", error.message);
  }
  
  // Test 3: IdentityRegistryGSN
  console.log("\n3. Testing IdentityRegistryGSN deployment...");
  try {
    const IdentityRegistryGSN = await ethers.getContractFactory("IdentityRegistryGSN");
    const registry = await IdentityRegistryGSN.deploy();
    await registry.waitForDeployment();
    console.log("✅ IdentityRegistryGSN: OK");
  } catch (error) {
    console.log("❌ IdentityRegistryGSN:", error.message);
  }
}

main().catch(console.error);