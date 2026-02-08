// scripts/whitelist.mjs
import pkg from "hardhat";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const { ethers } = pkg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  // Check if GSN is deployed
  const gsnDataPath = path.join(__dirname, "..", "src", "contractDataGSN.json");
  
  if (!fs.existsSync(gsnDataPath)) {
    console.error("❌ GSN not deployed.");
    process.exit(1);
  }
  
  const gsnData = JSON.parse(fs.readFileSync(gsnDataPath, "utf8"));
  const [deployer] = await ethers.getSigners();
  
  console.log("👥 WHITELIST USERS");
  console.log("==================");
  console.log("Paymaster:", gsnData.paymasterAddress);
  console.log("Deployer:", deployer.address);
  console.log("Network:", (await ethers.provider.getNetwork()).name);
  
  // Get addresses from multiple sources
  let userAddresses = [];
  
  // 1. Check for file input
  const testUsersPath = path.join(__dirname, "..", "src", "test-users.json");
  if (fs.existsSync(testUsersPath)) {
    userAddresses = JSON.parse(fs.readFileSync(testUsersPath, "utf8"));
    console.log(`\n📁 Loaded ${userAddresses.length} address(es) from test-users.json`);
  }
  
  // 2. Check for environment variable
  if (userAddresses.length === 0 && process.env.USER_ADDRESSES) {
    userAddresses = process.env.USER_ADDRESSES.split(',').map(addr => addr.trim());
    console.log(`\n📋 Using addresses from USER_ADDRESSES env var`);
  }
  
  // 3. Check for hardhat params (hre)
  if (userAddresses.length === 0 && hre && hre.args && hre.args.length > 0) {
    userAddresses = hre.args;
    console.log(`\n📋 Using addresses from command line args`);
  }
  
  // 4. If still empty, show help
  if (userAddresses.length === 0) {
    console.log("\n📖 USAGE OPTIONS:");
    console.log("   1. Via environment variable:");
    console.log("      USER_ADDRESSES=0x123...,0x456... npx hardhat run scripts/whitelist.mjs --network baseSepolia");
    console.log("\n   2. Via test-users.json file:");
    console.log("      echo '[\"0x123...\",\"0x456...\"]' > test-users.json");
    console.log("      npx hardhat run scripts/whitelist.mjs --network baseSepolia");
    console.log("\n   3. Direct command line (some Hardhat versions):");
    console.log("      npx hardhat run scripts/whitelist.mjs --network baseSepolia 0x123... 0x456...");
    console.log("\n💡 Current options available:");
    console.log("   - test-users.json:", fs.existsSync(testUsersPath) ? "EXISTS" : "NOT FOUND");
    console.log("   - USER_ADDRESSES env:", process.env.USER_ADDRESSES || "NOT SET");
    process.exit(1);
  }
  
  console.log(`\n📋 Processing ${userAddresses.length} user(s)...`);
  
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
  
  for (const userAddress of userAddresses) {
    try {
      if (!ethers.isAddress(userAddress)) {
        console.log(`❌ Invalid address: ${userAddress}`);
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
      
    } catch (error) {
      console.error(`❌ Failed to whitelist ${userAddress}:`, error.message);
      failCount++;
    }
  }
  
  console.log("\n🏁 SUMMARY:");
  console.log(`✅ Successful: ${successCount}`);
  console.log(`⏭️  Skipped:    ${skipCount}`);
  console.log(`❌ Failed:     ${failCount}`);
  console.log(`📊 Total:      ${userAddresses.length}`);
}

// Handle hardhat arguments
if (import.meta.url === `file://${process.argv[1]}`) {
  // Store arguments in hre object for the script to access
  if (!global.hre) global.hre = { args: [] };
  global.hre.args = process.argv.slice(2);
  
  main().catch(console.error);
}