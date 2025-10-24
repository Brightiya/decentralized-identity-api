// backend/src/controllers/claimController.js
import { ethers } from "ethers";
import dotenv from "dotenv";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

dotenv.config();

// Dynamically import contractData.json
const contractData = (async () => {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const contractDataPath = path.resolve(__dirname, "../../src/contractData.json");
  return JSON.parse(await readFile(contractDataPath, "utf8"));
})();

// -----------------------------
// Setup Provider & Contract
// -----------------------------
const providerUrl = process.env.PROVIDER_URL || "http://127.0.0.1:8545";
const privateKey = process.env.PRIVATE_KEY;

if (!privateKey) {
  throw new Error("❌ Missing PRIVATE_KEY in .env");
}

const provider = new ethers.JsonRpcProvider(providerUrl);
const signer = new ethers.Wallet(privateKey, provider);

// Resolve contractData and set up registryContract
(async () => {
  const { address, abi } = await contractData;
  globalThis.registryAddress = address;
  globalThis.registryContract = new ethers.Contract(address, abi, signer);
})();

// -----------------------------
// Helper: Convert string → bytes32 safely
// -----------------------------
const toBytes32 = (value) => {
  if (!value) throw new Error("Value required for toBytes32()");
  if (ethers.isHexString(value) && value.length === 66) return value; // already bytes32
  return ethers.keccak256(ethers.toUtf8Bytes(value));
};

// -----------------------------
// 1️⃣ Set Claim
// -----------------------------
export const setClaim = async (req, res) => {
  try {
    const { owner, claimId, claimHash } = req.body;

    if (!owner || !claimId || !claimHash) {
      return res.status(400).json({ error: "owner, claimId, and claimHash are required" });
    }

    // 🔹 Convert to bytes32
    const claimIdBytes32 = toBytes32(claimId);
    const claimHashBytes32 = toBytes32(claimHash);

    console.log("🧩 Setting claim:", { owner, claimIdBytes32, claimHashBytes32 });

    const tx = await globalThis.registryContract.setClaim(owner, claimIdBytes32, claimHashBytes32);
    await tx.wait();

    return res.json({
      message: "✅ Claim set successfully",
      txHash: tx.hash,
      claimId: claimIdBytes32,
      claimHash: claimHashBytes32,
    });
  } catch (err) {
    console.error("❌ setClaim error:", err);
    return res.status(500).json({ error: err.message });
  }
};

// -----------------------------
// 2️⃣ Get Claim
// -----------------------------
export const getClaim = async (req, res) => {
  try {
    const { owner, claimId } = req.params;

    if (!owner || !claimId) {
      return res.status(400).json({ error: "owner and claimId are required" });
    }

    const claimIdBytes32 = toBytes32(claimId);
    const claimHash = await globalThis.registryContract.getClaim(owner, claimIdBytes32);

    if (
      !claimHash ||
      claimHash === "0x0000000000000000000000000000000000000000000000000000000000000000"
    ) {
      return res.status(404).json({ error: "Claim not found" });
    }

    return res.json({
      message: "✅ Claim retrieved successfully",
      owner,
      claimId: claimIdBytes32,
      claimHash,
    });
  } catch (err) {
    console.error("❌ getClaim error:", err);
    return res.status(500).json({ error: err.message });
  }
};

// -----------------------------
// 3️⃣ Remove Claim
// -----------------------------
export const removeClaim = async (req, res) => {
  try {
    const { owner, claimId } = req.body;

    if (!owner || !claimId) {
      return res.status(400).json({ error: "owner and claimId are required" });
    }

    const claimIdBytes32 = toBytes32(claimId);

    console.log("🗑️ Removing claim:", { owner, claimIdBytes32 });

    const tx = await globalThis.registryContract.removeClaim(owner, claimIdBytes32);
    await tx.wait();

    return res.json({
      message: "✅ Claim removed successfully",
      txHash: tx.hash,
      claimId: claimIdBytes32,
    });
  } catch (err) {
    console.error("❌ removeClaim error:", err);
    return res.status(500).json({ error: err.message });
  }
};