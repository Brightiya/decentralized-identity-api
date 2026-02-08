// scripts/deploy-gsn.mjs
import pkg from "hardhat";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const { ethers } = pkg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("🚀 DEPLOYING GASLESS (GSN) STACK");
  console.log("Deployer:", deployer.address);
  console.log("Network:", (await ethers.provider.getNetwork()).name);
  console.log("================================");
  
  // Check if we have enough balance
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log(`💰 Deployer balance: ${ethers.formatEther(balance)} ETH`);
  
  if (balance < ethers.parseEther("0.1")) {
    console.error("❌ Insufficient balance for GSN deployment.");
    console.log("💡 Get test ETH from: https://sepoliafaucet.com");
    console.log("💡 Minimum required: 0.1 ETH");
    process.exit(1);
  }

  try {
    // 1. Check if original contract exists
    const originalDataPath = path.join(__dirname, "..", "src", "contractData.json");
    let originalContractAddress = null;
    
    if (fs.existsSync(originalDataPath)) {
      const originalData = JSON.parse(fs.readFileSync(originalDataPath, "utf8"));
      originalContractAddress = originalData.address;
      console.log("\n📋 Found original IdentityRegistry:", originalContractAddress);
    } else {
      console.log("\n⚠️  Original contract data not found.");
      console.log("   Run 'npx hardhat run scripts/deploy.mjs' first or continue anyway.");
    }

    // 2. Deploy GSN Forwarder
    console.log("\n1️⃣  Deploying GSN Forwarder...");
    const Forwarder = await ethers.getContractFactory("Forwarder");
    const forwarder = await Forwarder.deploy();
    await forwarder.waitForDeployment();
    const forwarderAddress = await forwarder.getAddress();
    console.log("✅ GSN Forwarder deployed to:", forwarderAddress);

    // 3. Deploy WhitelistPaymaster
    console.log("\n2️⃣  Deploying WhitelistPaymaster...");
    const Paymaster = await ethers.getContractFactory("WhitelistPaymaster");
    const paymaster = await Paymaster.deploy();
    await paymaster.waitForDeployment();
    const paymasterAddress = await paymaster.getAddress();
    console.log("✅ WhitelistPaymaster deployed to:", paymasterAddress);

    // 4. Fund Paymaster (0.5 ETH)
    console.log("\n3️⃣  Funding Paymaster with 0.5 ETH...");
    const fundTx = await deployer.sendTransaction({
      to: paymasterAddress,
      value: ethers.parseEther("0.5")
    });
    await fundTx.wait();
    console.log("✅ Paymaster funded with 0.5 ETH");
    console.log("   Transaction:", fundTx.hash);

    // 5. Deploy GSN-compatible IdentityRegistry
    console.log("\n4️⃣  Deploying IdentityRegistryGSN...");
    const IdentityRegistryGSN = await ethers.getContractFactory("IdentityRegistryGSN");
    const registryGSN = await IdentityRegistryGSN.deploy(forwarderAddress);
    await registryGSN.waitForDeployment();
    const registryGSNAddress = await registryGSN.getAddress();
    console.log("✅ IdentityRegistryGSN deployed to:", registryGSNAddress);

    // 6. Configure Paymaster to accept IdentityRegistryGSN
    console.log("\n5️⃣  Configuring Paymaster...");
    const configureTx = await paymaster.setTarget(registryGSNAddress, true);
    await configureTx.wait();
    console.log("✅ Paymaster configured for IdentityRegistryGSN");
    console.log("   Transaction:", configureTx.hash);

    // 7. Whitelist deployer for testing
    console.log("\n6️⃣  Whitelisting deployer address...");
    const whitelistTx = await paymaster.whitelistUser(deployer.address);
    await whitelistTx.wait();
    console.log("✅ Deployer whitelisted:", deployer.address);

    // 8. Save GSN contract data
    const gsnContractData = {
      gsnEnabled: true,
      forwarderAddress,
      paymasterAddress,
      identityRegistryGSN: registryGSNAddress,
      originalIdentityRegistry: originalContractAddress,
      deployer: deployer.address,
      abi: JSON.parse(registryGSN.interface.formatJson()),
      timestamp: new Date().toISOString(),
      network: (await ethers.provider.getNetwork()).name
    };

    const gsnOutputPath = path.join(__dirname, "..", "src", "contractDataGSN.json");
    fs.writeFileSync(gsnOutputPath, JSON.stringify(gsnContractData, null, 2));
    console.log("✅ GSN contract data written to:", gsnOutputPath);

    // 9. Create environment template
    const envTemplate = `# ============================================
# GASLESS TESTING CONFIGURATION (GSN)
# Generated: ${new Date().toISOString()}
# Network: ${(await ethers.provider.getNetwork()).name}
# ============================================

# Enable gasless mode
GSN_ENABLED=true

# GSN Contract Addresses
GSN_FORWARDER_ADDRESS=${forwarderAddress}
GSN_PAYMASTER_ADDRESS=${paymasterAddress}
IDENTITY_REGISTRY_GSN_ADDRESS=${registryGSNAddress}

# Optional: Use GSN contract instead of original
# CONTRACT_ADDRESS=${registryGSNAddress}

# ============================================
# WHITELISTING INSTRUCTIONS
# ============================================
# To whitelist users via CLI:
# npx hardhat run scripts/whitelist-user.mjs --network <network> <address1> <address2>
#
# OR via admin API:
# curl -X POST http://localhost:4000/api/gsn/whitelist \\
#   -H "Content-Type: application/json" \\
#   -d '{"adminKey":"your_admin_secret","userAddress":"0xUSER_ADDRESS"}'`;

    const envOutputPath = path.join(__dirname, "..", "..", ".env.gsn.example");
    fs.writeFileSync(envOutputPath, envTemplate);
    console.log("✅ GSN environment template created at:", envOutputPath);

    // 10. Print summary
    console.log("\n🎉 GSN DEPLOYMENT COMPLETE!");
    console.log("==================================");
    console.log("📊 CONTRACT ADDRESSES:");
    console.log("   GSN Forwarder:     ", forwarderAddress);
    console.log("   Paymaster:         ", paymasterAddress);
    console.log("   IdentityRegistryGSN:", registryGSNAddress);
    if (originalContractAddress) {
      console.log("   Original Contract:  ", originalContractAddress);
    }
    
    console.log("\n💰 PAYMASTER BALANCE: 0.5 ETH");
    console.log("   Estimated ~5000 gasless transactions");
    
    console.log("\n👥 WHITELISTED USERS:");
    console.log("   -", deployer.address, "(deployer)");
    
    console.log("\n📋 NEXT STEPS:");
    console.log("   1. Copy GSN addresses from .env.gsn.example to your .env file");
    console.log("   2. Whitelist test users:");
    console.log("      npx hardhat run scripts/whitelist-user.mjs --network sepolia 0x123...");
    console.log("   3. Update backend to check GSN_ENABLED");
    console.log("   4. Test gasless transactions!");
    
    console.log("\n⚠️  IMPORTANT:");
    console.log("   - Monitor paymaster balance at scripts/check-paymaster.mjs");
    console.log("   - Refill paymaster when balance < 0.1 ETH");
    console.log("   - Gasless mode is for TESTING only");

  } catch (error) {
    console.error("\n❌ GSN DEPLOYMENT FAILED!");
    console.error("Error:", error.message);
    
    if (error.message.includes("nonce")) {
      console.log("\n💡 Try resetting your account nonce:");
      console.log("   1. Send a small transaction from this account");
      console.log("   2. Wait for confirmation");
      console.log("   3. Try deployment again");
    }
    
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});