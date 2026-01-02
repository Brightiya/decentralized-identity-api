// backend/src/controllers/profileController.js
import { ethers } from "ethers";
import { uploadJSON, fetchJSON, unpinCID } from "../utils/pinata.js";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

dotenv.config();

/* ------------------------------------------------------------------
   Contract bootstrap
------------------------------------------------------------------- */

const contractData = (async () => {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const contractDataPath = path.resolve(
    __dirname,
    "../../src/contractData.json"
  );
  return JSON.parse(await readFile(contractDataPath, "utf8"));
})();

const providerUrl = process.env.PROVIDER_URL || "http://127.0.0.1:8545";
const privateKey = process.env.PRIVATE_KEY;

if (!privateKey) throw new Error("❌ Missing PRIVATE_KEY in .env");

const provider = new ethers.JsonRpcProvider(providerUrl);
const signer = new ethers.Wallet(privateKey, provider);

(async () => {
  const { address, abi } = await contractData;
  globalThis.registry = new ethers.Contract(address, abi, signer);
})();

/* ------------------------------------------------------------------
   CREATE / UPDATE PROFILE (MERGED, STATE-SAFE)
------------------------------------------------------------------- */

export const createOrUpdateProfile = async (req, res) => {
  try {
    const { owner, contexts = {}, credentials = [] } = req.body;
    if (!owner) {
      return res.status(400).json({ error: "owner address required" });
    }

    let existingProfile = {};

     // 🚫 GDPR HARD STOP — erased profiles cannot be recreated
    const existingCid = await registry.getProfileCID(owner);
    if (existingCid && existingCid.length > 0) {
      try {
        const existing = await fetchJSON(existingCid);
        if (existing?.erased === true) {
          return res.status(403).json({
            error: "Profile erased under GDPR Art.17 and cannot be recreated"
          });
        }
      } catch {
        // Ignore fetch errors here; normal flow continues
      }
    }

    // 🧠 Merge instead of overwrite
    const mergedProfile = {
      ...existingProfile,
      id: `did:example:${owner}`,

      contexts: {
        ...(existingProfile.contexts || {}),
        ...contexts
      },

      credentials: [
        ...(existingProfile.credentials || []),
        ...credentials
      ],

      updatedAt: new Date().toISOString()
    };

    const ipfsUri = await uploadJSON(mergedProfile);
    const cid = ipfsUri.replace("ipfs://", "");

    await (await registry.setProfileCID(owner, cid)).wait();

    return res.json({
      message: "✅ Profile merged & stored",
      cid,
      ipfsUri
    });
  } catch (err) {
    console.error("❌ createOrUpdateProfile error:", err);
    return res.status(500).json({ error: err.message });
  }
};

/* ------------------------------------------------------------------
   CONTEXT-AWARE PROFILE READ (RESOLVES VCs → ATTRIBUTES)
------------------------------------------------------------------- */

export const getProfile = async (req, res) => {
  try {
    const { address } = req.params;
    const context = req.query.context || "default";

    if (!address) {
      return res.status(400).json({ error: "address required" });
    }

    const cid = await registry.getProfileCID(address);
    if (!cid || cid.length === 0) {
      return res.status(404).json({ error: "Profile not found" });
    }

    const profile = await fetchJSON(cid);

    // 🔥 ADD THIS BLOCK
if (profile?.erased === true) {
  return res.status(410).json({
    did: `did:ethr:${address}`,
    erased: true,
    erasedAt: profile.erasedAt,
    message: "Profile erased under GDPR Art.17"
  });
}

    // ✅ Correct context filtering
    const credentials = (profile.credentials || []).filter(
      c => c.context === context
    );

    const attributes = {};

    for (const cred of credentials) {
      try {
        const vc = await fetchJSON(cred.cid);
        const claim = vc?.credentialSubject?.claim;

        if (claim && typeof claim === "object") {
          Object.assign(attributes, claim);
        }
      } catch (e) {
        console.warn("⚠️ Failed to resolve VC:", cred.cid);
      }
    }

    return res.json({
      did: `did:ethr:${address}`,
      context,
      attributes,
      credentials
    });

  } catch (err) {
    console.error("❌ getProfile error:", err);
    return res.status(500).json({ error: err.message });
  }
};


/* ------------------------------------------------------------------
   GDPR ART.17 — RIGHT TO ERASURE
------------------------------------------------------------------- */

export const eraseProfile = async (req, res) => {
  try {
    const { owner } = req.body;
    if (!owner) {
      return res.status(400).json({ error: "owner required" });
    }

    const oldCid = await registry.getProfileCID(owner);
    if (oldCid && oldCid.length > 0) {
      await unpinCID(oldCid);
    }

    const tombstone = {
      id: `did:example:${owner}`,
      erased: true,
      erasedAt: new Date().toISOString()
    };

    const ipfsUri = await uploadJSON(tombstone);
    const newCid = ipfsUri.replace("ipfs://", "");

    await (await registry.setProfileCID(owner, newCid)).wait();

    return res.json({
      message: "✅ Profile erased (GDPR compliant)",
      newCid
    });
  } catch (err) {
    console.error("❌ eraseProfile error:", err);
    return res.status(500).json({ error: err.message });
  }
};
