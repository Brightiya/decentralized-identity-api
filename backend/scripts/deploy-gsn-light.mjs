// scripts/deploy-gsn-light.mjs
import pkg from "hardhat";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const { ethers } = pkg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Wait for transaction to confirm
async function waitForTransaction(tx, name) {
  console.log(`   ⏳ ${name} sent: ${tx.hash}`);
  console.log(`   Waiting for confirmation...`);
  
  const receipt = await tx.wait();
  console.log(`   ✅ ${name} confirmed in block ${receipt.blockNumber}`);
  console.log(`   Gas used: ${receipt.gasUsed.toString()}`);
  return receipt;
}

// Wait function with progress indicator
async function wait(seconds, message) {
  console.log(`   ⏳ ${message} (${seconds}s)`);
  for (let i = 0; i < seconds; i++) {
    process.stdout.write(`   ${i + 1}/${seconds}... `);
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  console.log("\n");
}

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("🚀 BASE-FRIENDLY GSN DEPLOYMENT");
  console.log("Deployer:", deployer.address);
  console.log("Network:", (await ethers.provider.getNetwork()).name);
  console.log("=================================");
  
  // Get next nonce
  const nextNonce = await ethers.provider.getTransactionCount(deployer.address, "pending");
  console.log(`📊 Next available nonce: ${nextNonce}`);
  
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log(`💰 Balance: ${ethers.formatEther(balance)} ETH`);
  
  if (balance < ethers.parseEther("0.05")) {
    console.error("❌ Insufficient balance");
    process.exit(1);
  }
  
  try {
    let currentNonce = nextNonce;
    
    // 1. Deploy Forwarder
    console.log(`\n1️⃣  Deploying Forwarder (nonce: ${currentNonce})...`);
    const Forwarder = await ethers.getContractFactory("Forwarder");
    const forwarder = await Forwarder.deploy({
      nonce: currentNonce++,
      gasPrice: ethers.parseUnits("3", "gwei")
    });
    const forwarderReceipt = await forwarder.waitForDeployment();
    const forwarderAddress = await forwarder.getAddress();
    console.log(`✅ Forwarder: ${forwarderAddress}`);
    
    // Wait before next transaction (Base network requirement)
    await wait(10, "Waiting for network to process Forwarder deployment");
    
    // 2. Deploy Paymaster
    console.log(`\n2️⃣  Deploying Paymaster (nonce: ${currentNonce})...`);
    const Paymaster = await ethers.getContractFactory("WhitelistPaymaster");
    const paymaster = await Paymaster.deploy({
      nonce: currentNonce++,
      gasPrice: ethers.parseUnits("3.5", "gwei")
    });
    const paymasterReceipt = await paymaster.waitForDeployment();
    const paymasterAddress = await paymaster.getAddress();
    console.log(`✅ Paymaster: ${paymasterAddress}`);
    
    await wait(10, "Waiting for network to process Paymaster deployment");
    
    // 3. Fund Paymaster
    console.log(`\n3️⃣  Funding Paymaster (nonce: ${currentNonce})...`);
    const fundTx = await deployer.sendTransaction({
      to: paymasterAddress,
      value: ethers.parseEther("0.02"),
      nonce: currentNonce++,
      gasPrice: ethers.parseUnits("5", "gwei"),
      gasLimit: 50000
    });
    const fundReceipt = await waitForTransaction(fundTx, "Paymaster funding");
    
    await wait(10, "Waiting for funding to settle");
    
    // 4. Deploy IdentityRegistryGSN
    console.log(`\n4️⃣  Deploying IdentityRegistryGSN (nonce: ${currentNonce})...`);
    const IdentityRegistryGSN = await ethers.getContractFactory("IdentityRegistryGSN");
    const registryGSN = await IdentityRegistryGSN.deploy(
        forwarderAddress,
        {
          nonce: currentNonce++,
          gasPrice: ethers.parseUnits("3", "gwei")
        }
      );


    const registryReceipt = await registryGSN.waitForDeployment();
    const registryGSNAddress = await registryGSN.getAddress();
    console.log(`✅ IdentityRegistryGSN: ${registryGSNAddress}`);
    
    await wait(10, "Waiting for network to process Registry deployment");
    
    // 5. Configure Paymaster
    console.log(`\n5️⃣  Configuring Paymaster (nonce: ${currentNonce})...`);
    const configureTx = await paymaster.setTarget(registryGSNAddress, true, {
      nonce: currentNonce++,
      gasPrice: ethers.parseUnits("3", "gwei")
    });
    const configReceipt = await waitForTransaction(configureTx, "Paymaster configuration");
    
    await wait(10, "Waiting for configuration to settle");
    
    // 6. Whitelist deployer
    console.log(`\n6️⃣  Whitelisting deployer (nonce: ${currentNonce})...`);
    const whitelistTx = await paymaster.whitelistUser(deployer.address, {
      nonce: currentNonce++,
      gasPrice: ethers.parseUnits("3", "gwei")
    });
    const whitelistReceipt = await waitForTransaction(whitelistTx, "Whitelisting");
    
    // Save data
    const gsnData = {
      gsnEnabled: true,
      forwarderAddress,
      paymasterAddress,
      identityRegistryGSN: registryGSNAddress,
      deployer: deployer.address,
      startingNonce: nextNonce,
      endingNonce: currentNonce - 1,
      timestamp: new Date().toISOString(),
      network: (await ethers.provider.getNetwork()).name,
      paymasterBalance: "0.02",
      transactions: {
        forwarder: forwarderReceipt.hash,
        paymaster: paymasterReceipt.hash,
        funding: fundTx.hash,
        registry: registryReceipt.hash,
        configure: configureTx.hash,
        whitelist: whitelistTx.hash
      }
    };
    
    const outputPath = path.join(__dirname, "..", "src", "contractDataGSN.json");
    fs.writeFileSync(outputPath, JSON.stringify(gsnData, null, 2));
    
    console.log("\n🎉 BASE-FRIENDLY DEPLOYMENT COMPLETE!");
    console.log("======================================");
    console.log("📊 Contract Addresses:");
    console.log(`   Forwarder:       ${forwarderAddress}`);
    console.log(`   Paymaster:       ${paymasterAddress}`);
    console.log(`   RegistryGSN:     ${registryGSNAddress}`);
    console.log(`\n💰 Paymaster funded with 0.02 ETH`);
    console.log(`📁 Data saved to: ${outputPath}`);
    console.log(`\n⏱️  Total deployment took ~1-2 minutes`);
    
  } catch (error) {
    console.error("\n❌ DEPLOYMENT FAILED!");
    console.error("Error:", error.message);
    
    if (error.message.includes("in-flight transaction limit")) {
      console.log("\n🔧 Base network limitation:");
      console.log("   Base limits concurrent transactions from the same account.");
      console.log("   This script waits 10 seconds between transactions.");
      console.log("   Try running it again in 30 seconds.");
    }
  }
}

main().catch(console.error);