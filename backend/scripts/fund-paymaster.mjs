// scripts/fund-paymaster.mjs
import pkg from "hardhat";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const { ethers } = pkg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  const gsnDataPath = path.join(__dirname, "..", "src", "contractDataGSN.json");
  
  if (!fs.existsSync(gsnDataPath)) {
    console.error("❌ GSN not deployed.");
    process.exit(1);
  }
  
  const gsnData = JSON.parse(fs.readFileSync(gsnDataPath, "utf8"));
  const [deployer] = await ethers.getSigners();
  
  // Get amount from command line or use default
  let amountETH = "0.5";
  if (process.argv.length > 2) {
    amountETH = process.argv[2];
  }
  
  const amountWei = ethers.parseEther(amountETH);
  const deployerBalance = await ethers.provider.getBalance(deployer.address);
  
  console.log("💰 FUND PAYMASTER");
  console.log("================");
  console.log("From:", deployer.address);
  console.log("To:  ", gsnData.paymasterAddress);
  console.log("Amount:", amountETH, "ETH");
  console.log("Deployer balance:", ethers.formatEther(deployerBalance), "ETH");
  
  if (deployerBalance < amountWei * 11n / 10n) { // 10% buffer for gas
    console.error("❌ Insufficient balance (need extra for gas)");
    process.exit(1);
  }
  
  console.log("\n📝 Sending transaction...");
  const tx = await deployer.sendTransaction({
    to: gsnData.paymasterAddress,
    value: amountWei
  });
  
  console.log("⏳ Waiting for confirmation...");
  await tx.wait();
  
  console.log("✅ Transaction confirmed!");
  console.log("Hash:", tx.hash);
  
  // Show new balance
  const newBalance = await ethers.provider.getBalance(gsnData.paymasterAddress);
  console.log("\n💰 New paymaster balance:", ethers.formatEther(newBalance), "ETH");
}

main().catch(console.error);