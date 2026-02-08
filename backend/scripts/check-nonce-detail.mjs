import pkg from "hardhat";

const { ethers } = pkg;

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("🔍 DETAILED NONCE CHECK");
  console.log("Address:", deployer.address);
  console.log("=========================");
  
  // Get all three types of nonces
  const latestNonce = await ethers.provider.getTransactionCount(deployer.address, "latest");
  const pendingNonce = await ethers.provider.getTransactionCount(deployer.address, "pending");
  const safeNonce = await ethers.provider.getTransactionCount(deployer.address, "safe");
  
  console.log(`Latest nonce:  ${latestNonce}`);
  console.log(`Pending nonce: ${pendingNonce}`);
  console.log(`Safe nonce:    ${safeNonce}`);
  console.log(`\nNext available nonce: ${pendingNonce}`);
  
  if (pendingNonce > latestNonce) {
    console.log(`\n⚠️  ${pendingNonce - latestNonce} transaction(s) in mempool`);
    console.log("   They will need to confirm or be replaced.");
  }
  
  // Get recent transactions
  console.log("\n📜 Recent transactions:");
  try {
    // This is a simplified check - in reality you'd need to query a block explorer API
    console.log("   Check: https://sepolia.basescan.org/address/" + deployer.address);
  } catch (error) {
    // Ignore
  }
}

main().catch(console.error);