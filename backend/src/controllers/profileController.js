// backend/src/controllers/profileController.js
import { ethers } from "ethers";
import { uploadJSON, fetchJSON } from "../utils/pinata.js";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

dotenv.config();

// Dynamically import contractData.json
const contractData = (async () => {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const contractDataPath = path.resolve(__dirname, "../../src/contractData.json");
  return JSON.parse(await readFile(contractDataPath, "utf8"));
})();

const providerUrl = process.env.PROVIDER_URL || "http://127.0.0.1:8545";
const privateKey = process.env.PRIVATE_KEY;

if (!privateKey) {
  throw new Error("❌ Missing PRIVATE_KEY in .env");
}

const provider = new ethers.JsonRpcProvider(providerUrl);
const signer = new ethers.Wallet(privateKey, provider);

// Initialize registry contract after resolving contractData
(async () => {
  const { address, abi } = await contractData;
  globalThis.registry = new ethers.Contract(address, abi, signer);
})();

/**
 * Create or update a user profile
 */
export const createOrUpdateProfile = async (req, res) => {
  try {
    const { owner, name, email, credentials = [] } = req.body;
    if (!owner) return res.status(400).json({ error: "owner address required" });

    // Build profile object
    const profile = {
      id: `did:example:${owner}`,
      name,
      email,
      credentials,
      updatedAt: new Date().toISOString(),
    };

    // Upload to IPFS
    const ipfsUri = await uploadJSON(profile);
    const cid = ipfsUri.replace("ipfs://", "");

    // Store CID on-chain
    const tx = await registry.setProfileCID(owner, cid);
    await tx.wait();

    return res.json({
      message: "✅ Profile updated successfully",
      cid,
      ipfsUri,
      gatewayUrl: `https://gateway.pinata.cloud/ipfs/${cid}`,
    });
  } catch (err) {
    console.error("❌ createOrUpdateProfile error:", err);
    return res.status(500).json({ error: err.message });
  }
};

/**
 * Retrieve a user's full profile (including VCs)
 */
export const getProfile = async (req, res) => {
  try {
    const { address } = req.params;
    if (!address) return res.status(400).json({ error: "address required" });

    const cid = await registry.getProfileCID(address);
    if (!cid || cid.length === 0) return res.status(404).json({ error: "Profile not found" });

    const profile = await fetchJSON(cid);
    return res.json({
      message: "✅ Profile fetched successfully",
      profile,
      cid,
      gatewayUrl: `https://gateway.pinata.cloud/ipfs/${cid}`,
    });
  } catch (err) {
    console.error("❌ getProfile error:", err);
    return res.status(500).json({ error: err.message });
  }
};
