import pkg from "hardhat";

const { ethers } = pkg;

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("🔧 RESETTING TRANSACTION NONCE");
  console.log("Address:", deployer.address);
  
  // Get current nonces
  const latestNonce = await ethers.provider.getTransactionCount(deployer.address, "latest");
  const pendingNonce = await ethers.provider.getTransactionCount(deployer.address, "pending");
  
  console.log(`Latest nonce:  ${latestNonce}`);
  console.log(`Pending nonce: ${pendingNonce}`);
  
  if (pendingNonce <= latestNonce) {
    console.log("✅ No pending transactions to reset");
    return;
  }
  
  console.log(`\n⚠️  ${pendingNonce - latestNonce} pending transaction(s) detected`);
  console.log("Sending reset transaction...");
  
  // Send a transaction to reset nonce
  const tx = await deployer.sendTransaction({
    to: deployer.address,
    value: ethers.parseEther("0.0001"),
    gasPrice: ethers.parseUnits("3", "gwei"), // Higher gas price
    gasLimit: 21000,
    nonce: latestNonce // Use the latest nonce, not pending
  });
  
  console.log(`\n📤 Transaction sent: ${tx.hash}`);
  console.log("Waiting for confirmation...");
  
  // Wait with progress
  let dots = 0;
  const interval = setInterval(() => {
    process.stdout.write(`\r⏳ Waiting${'.'.repeat(dots % 4)}   `);
    dots++;
  }, 500);
  
  const receipt = await tx.wait();
  clearInterval(interval);
  
  console.log(`\n✅ Transaction confirmed in block ${receipt.blockNumber}`);
  console.log(`💰 Gas used: ${receipt.gasUsed.toString()}`);
  console.log(`🔢 New latest nonce: ${await ethers.provider.getTransactionCount(deployer.address, "latest")}`);
}

main().catch(console.error);