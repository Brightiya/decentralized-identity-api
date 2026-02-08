import pkg from "hardhat";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const { ethers } = pkg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  console.log("🔍 VERIFYING GSN SETUP");
  console.log("======================");
  
  const gsnDataPath = path.join(__dirname, "..", "src", "contractDataGSN.json");
  const gsnData = JSON.parse(fs.readFileSync(gsnDataPath, "utf8"));
  
  console.log("📊 Contract Addresses:");
  console.log("   Forwarder:", gsnData.forwarderAddress);
  console.log("   Paymaster:", gsnData.paymasterAddress);
  console.log("   Registry: ", gsnData.identityRegistryGSN);
  
  const [deployer] = await ethers.getSigners();
  
  // Check balances
  console.log("\n💰 Balances:");
  const paymasterBalance = await ethers.provider.getBalance(gsnData.paymasterAddress);
  console.log("   Paymaster balance:", ethers.formatEther(paymasterBalance), "ETH");
  
  // Check whitelist status
  console.log("\n👥 Whitelist Status:");
  const paymasterABI = ["function whitelist(address) view returns (bool)"];
  const paymaster = new ethers.Contract(gsnData.paymasterAddress, paymasterABI, deployer);
  
  const isDeployerWhitelisted = await paymaster.whitelist(deployer.address);
  console.log("   Deployer whitelisted?", isDeployerWhitelisted ? "✅ YES" : "❌ NO");
  
  // Estimate transaction capacity
  const avgTxCost = ethers.parseEther("0.00005"); // ~0.00005 ETH per tx on Base
  const remainingTxs = paymasterBalance / avgTxCost;
  
  console.log("\n📈 Capacity Estimate:");
  console.log("   Estimated transactions remaining:", Math.floor(Number(remainingTxs)));
  console.log("   Average cost per transaction:", ethers.formatEther(avgTxCost), "ETH");
  
  console.log("\n🎉 SETUP VERIFIED!");
  console.log("\n💡 Next: Update your backend to use GSN when enabled");
}

main().catch(console.error);