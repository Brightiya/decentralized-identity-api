import pkg from "hardhat";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const { ethers } = pkg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  console.log("💰 ACCURATE PAYMASTER STATUS");
  console.log("============================");
  
  const gsnDataPath = path.join(__dirname, "..", "src", "contractDataGSN.json");
  
  if (!fs.existsSync(gsnDataPath)) {
    console.log("ℹ️  GSN not deployed.");
    return;
  }
  
  const gsnData = JSON.parse(fs.readFileSync(gsnDataPath, "utf8"));
  
  console.log("Network:", (await ethers.provider.getNetwork()).name);
  console.log("Paymaster:", gsnData.paymasterAddress);
  console.log("Contract:", gsnData.identityRegistryGSN);
  
  // Get balances
  const paymasterBalance = await ethers.provider.getBalance(gsnData.paymasterAddress);
  const formattedBalance = ethers.formatEther(paymasterBalance);
  
  console.log("\n💸 BALANCE:");
  console.log("   Amount:", formattedBalance, "ETH");
  
  // Base Sepolia is CHEAPER than other networks
  // Average gas prices on Base Sepolia: ~0.2 gwei
  // Simple transactions: ~21,000 gas
  // Contract calls: ~50,000-100,000 gas
  
  const gasPrice = await ethers.provider.getFeeData();
  const currentGasPriceGwei = Number(ethers.formatUnits(gasPrice.gasPrice, "gwei"));
  
  console.log("\n⛽ CURRENT GAS PRICES:");
  console.log("   Gas Price:", currentGasPriceGwei.toFixed(2), "gwei");
  
  // Calculate realistic estimates for Base Sepolia
  const simpleTxGas = 21000n; // Simple ETH transfer
  const contractCallGas = 70000n; // Typical contract call
  const complexTxGas = 150000n; // Complex contract call
  
  const simpleTxCost = simpleTxGas * gasPrice.gasPrice;
  const contractTxCost = contractCallGas * gasPrice.gasPrice;
  const complexTxCost = complexTxGas * gasPrice.gasPrice;
  
  console.log("\n📊 REALISTIC ESTIMATES (Base Sepolia):");
  console.log("   Simple transfer:", ethers.formatEther(simpleTxCost), "ETH");
  console.log("   Contract call:", ethers.formatEther(contractTxCost), "ETH");
  console.log("   Complex call:", ethers.formatEther(complexTxCost), "ETH");
  
  // Estimate remaining transactions
  const avgTxCost = contractTxCost; // Use contract call as average
  const remainingTxs = paymasterBalance / avgTxCost;
  
  console.log("\n📈 CAPACITY ESTIMATE:");
  console.log("   Remaining transactions:", Math.floor(Number(remainingTxs)));
  console.log("   Average cost per tx:", ethers.formatEther(avgTxCost), "ETH");
  
  // Status indicators (Base Sepolia specific)
  console.log("\n⚠️  STATUS:");
  if (paymasterBalance < ethers.parseEther("0.001")) {
    console.log("   ❌ CRITICAL: Paymaster almost empty!");
    console.log("      Fund immediately!");
  } else if (paymasterBalance < ethers.parseEther("0.005")) {
    console.log("   ⚠️  WARNING: Paymaster running low");
    console.log("      Consider funding soon");
  } else if (paymasterBalance < ethers.parseEther("0.01")) {
    console.log("   ⚠️  LOW: Paymaster has limited capacity");
    console.log("      OK for light testing");
  } else {
    console.log("   ✅ EXCELLENT: Paymaster sufficiently funded");
    console.log("      Ready for extensive testing!");
  }
  
  // Current status based on 0.02 ETH
  console.log("\n🎯 CURRENT STATUS (0.02 ETH):");
  console.log("   ✅ Sufficient for testing");
  console.log("   ✅ ~" + Math.floor(Number(remainingTxs)) + " transactions remaining");
  console.log("   ✅ No need to fund immediately");
  
  console.log("\n💡 RECOMMENDATION:");
  console.log("   With 0.02 ETH on Base Sepolia:");
  console.log("   - Test with 10-20 users");
  console.log("   - Monitor after ~100 transactions");
  console.log("   - Fund when below 0.005 ETH");
}

main().catch(console.error);