// scripts/whitelist-batch.mjs
import pkg from "hardhat";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const { ethers } = pkg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  // Load GSN data
  const gsnDataPath = path.join(__dirname, "..", "src", "contractDataGSN.json");
  
  if (!fs.existsSync(gsnDataPath)) {
    console.error("❌ GSN not deployed. Run deploy-gsn-light.mjs first.");
    process.exit(1);
  }
  
  const gsnData = JSON.parse(fs.readFileSync(gsnDataPath, "utf8"));
  const [deployer] = await ethers.getSigners();
  
  console.log("👥 BATCH WHITELISTING");
  console.log("====================");
  console.log("Paymaster:", gsnData.paymasterAddress);
  console.log("Deployer:", deployer.address);
  console.log("Network:", (await ethers.provider.getNetwork()).name);
  
  // Load user addresses from JSON file
  const usersFilePath = path.join(__dirname, "..", "src", "test-users.json");
  
  if (!fs.existsSync(usersFilePath)) {
    console.error("❌ test-users.json not found");
    console.log("💡 Create it with: echo '[\"0x123...\", \"0x456...\"]' > test-users.json");
    process.exit(1);
  }
  
  const userAddresses = JSON.parse(fs.readFileSync(usersFilePath, "utf8"));
  
  console.log(`\n📋 Found ${userAddresses.length} user(s) in test-users.json`);
  
  // Connect to paymaster
  const paymasterABI = [
    "function whitelistUser(address) external",
    "function whitelist(address) view returns (bool)"
  ];
  
  const paymaster = new ethers.Contract(
    gsnData.paymasterAddress,
    paymasterABI,
    deployer
  );
  
  let successCount = 0;
  let skipCount = 0;
  let failCount = 0;
  
  console.log("\n🔧 Processing whitelist requests...");
  
  for (const userAddress of userAddresses) {
    try {
      // Validate address
      if (!ethers.isAddress(userAddress)) {
        console.log(`❌ Invalid address in JSON: ${userAddress}`);
        failCount++;
        continue;
      }
      
      const checksumAddress = ethers.getAddress(userAddress);
      
      // Check if already whitelisted
      const isWhitelisted = await paymaster.whitelist(checksumAddress);
      
      if (isWhitelisted) {
        console.log(`⏭️  ${checksumAddress} already whitelisted`);
        skipCount++;
        continue;
      }
      
      // Whitelist user
      console.log(`   Whitelisting ${checksumAddress}...`);
      const tx = await paymaster.whitelistUser(checksumAddress);
      await tx.wait();
      
      console.log(`✅ ${checksumAddress} whitelisted`);
      console.log(`   Transaction: ${tx.hash}`);
      successCount++;
      
      // Small delay to avoid Base network limits
      if (successCount % 3 === 0) {
        console.log("   ⏳ Waiting 5 seconds for network...");
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
      
    } catch (error) {
      console.error(`❌ Failed to whitelist ${userAddress}:`, error.message);
      failCount++;
      
      // If it's a network limit error, wait longer
      if (error.message.includes("in-flight")) {
        console.log("   ⏳ Base network limit hit, waiting 10 seconds...");
        await new Promise(resolve => setTimeout(resolve, 10000));
      }
    }
  }
  
  console.log("\n🏁 BATCH WHITELISTING SUMMARY");
  console.log("============================");
  console.log(`✅ Successful: ${successCount}`);
  console.log(`⏭️  Skipped:    ${skipCount}`);
  console.log(`❌ Failed:     ${failCount}`);
  console.log(`📊 Total:      ${userAddresses.length}`);
  
  if (successCount > 0) {
    console.log("\n🎉 Users can now use your dApp gaslessly!");
    console.log("\n💡 Remind testers:");
    console.log("   1. Connect to Base Sepolia network");
    console.log("   2. No ETH needed in their wallet");
    console.log("   3. Enable 'Gasless Mode' in your dApp");
  }
}

main().catch(console.error);