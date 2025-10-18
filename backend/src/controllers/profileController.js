// backend/src/controllers/profileController.js
import { ethers } from "ethers";
import { uploadJSON, fetchJSON } from "../utils/pinata.js";
import contractData from "../../src/contractData.json" assert { type: "json" };
import dotenv from "dotenv";

dotenv.config();

const provider = new ethers.JsonRpcProvider(process.env.PROVIDER_URL);
const signer = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
const registry = new ethers.Contract(contractData.address, contractData.abi, signer);

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
