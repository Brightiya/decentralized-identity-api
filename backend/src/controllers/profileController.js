// backend/src/controllers/profileController.js
import { ethers } from "ethers";
import { uploadJSON, fetchJSON, unpinCID } from "../utils/pinata.js";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

dotenv.config();

/* ------------------------------------------------------------------
   Contract bootstrap (global registry)
------------------------------------------------------------------- */

const contractData = (async () => {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const contractDataPath = path.resolve(__dirname, "../../src/contractData.json");
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
   English labels for translatable fields
------------------------------------------------------------------- */

const genderLabels = {
  male: "Male",
  female: "Female",
  "non-binary": "Non-binary",
  genderqueer: "Genderqueer",
  transgender: "Transgender",
  "prefer-not-to-say": "Prefer not to say",
  other: "Other"
};

/* ------------------------------------------------------------------
   Helper: Get Pinata JWT for this request (user > shared)
------------------------------------------------------------------- */
function getPinataJwtForRequest(req) {
  const userJwt = req.headers['x-pinata-user-jwt'];
  if (userJwt) {
    return userJwt;
  }

  // Fallback to shared key
  if (process.env.NODE_ENV !== 'development') {
    console.warn('[SECURITY] Using shared Pinata JWT in production mode - recommend per-user keys');
  }
  return process.env.PINATA_JWT;
}

/* ------------------------------------------------------------------
   CREATE / UPDATE PROFILE (MERGED, STATE-SAFE)
------------------------------------------------------------------- */

export const createOrUpdateProfile = async (req, res) => {
  try {
    const { owner, contexts = {}, credentials = [], attributes = {} } = req.body;

    if (!owner) {
      return res.status(400).json({ error: "owner address required" });
    }

    const subjectAddress = owner.toLowerCase(); // normalize

    let existingProfile = {};

    // GDPR HARD STOP — erased profiles cannot be recreated
    const existingCid = await registry.getProfileCID(subjectAddress);
    if (existingCid && existingCid.length > 0) {
      try {
        const existing = await fetchJSON(existingCid);
        if (existing?.erased === true) {
          return res.status(403).json({
            error: "Profile erased under GDPR Art.17 and cannot be recreated"
          });
        }
        existingProfile = existing;
      } catch {
        // silent ignore - proceed with creation
      }
    }

    // Merge new data
    const mergedProfile = {
      ...existingProfile,
      id: `did:ethr:${subjectAddress}`,
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

    // Optional: clean up any old top-level fields from previous saves
    delete mergedProfile.attributes;
    delete mergedProfile.online_links;

    // Use per-request JWT (user's key preferred)
    const pinataJwt = getPinataJwtForRequest(req);

    const ipfsUri = await uploadJSON(mergedProfile, pinataJwt);
    const cid = ipfsUri.replace("ipfs://", "");

    await (await registry.setProfileCID(subjectAddress, cid)).wait();

    return res.json({
      message: "✅ Profile merged & stored",
      cid,
      ipfsUri
    });
  } catch (err) {
    console.error("❌ createOrUpdateProfile error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
};

/* ------------------------------------------------------------------
   CONTEXT-AWARE PROFILE READ (RESOLVES VCs → ATTRIBUTES)
------------------------------------------------------------------- */

export const getProfile = async (req, res) => {
  try {
    const { address } = req.params;
    const context = req.query.context || "profile";

    if (!address) {
      return res.status(400).json({ error: "address required" });
    }

    const cid = await registry.getProfileCID(address.toLowerCase());
    if (!cid || cid.length === 0) {
      return res.status(404).json({ error: "Profile not found" });
    }

    const profile = await fetchJSON(cid);

    if (profile?.erased === true) {
      return res.status(410).json({
        did: `did:ethr:${address}`,
        erased: true,
        erasedAt: profile.erasedAt,
        message: "Profile erased under GDPR Art.17"
      });
    }

    // Prefer data from the requested context (new structure)
    const ctxData = profile.contexts?.[context] || {};

    // Build attributes — context first, then fallback to old top-level (for migration)
    let attributes = {
      ...ctxData.attributes,                // ← primary source (new)
      ...profile.attributes                 // ← fallback (old)
    };

    // Build online_links — same priority
    let online_links = {
      ...ctxData.online_links,
      ...profile.online_links
    };

    // Filter credentials by requested context
    const credentials = (profile.credentials || []).filter(
      c => c.context === context
    );

    // Resolve VCs into attributes (your existing logic — kept intact)
    for (const cred of credentials) {
      try {
        const vc = await fetchJSON(cred.cid);
        const claim = vc?.credentialSubject?.claim;

        if (claim && typeof claim === "object") {
          // Special handling for gender
          if (claim.gender) {
            attributes.gender = {
              code: claim.gender,
              label: genderLabels[claim.gender] || claim.gender
            };
          } else {
            Object.assign(attributes, claim);
          }
        }
      } catch (e) {
        console.warn(`⚠️ Failed to resolve VC: ${cred.cid}`);
      }
    }

    // Clean response — no duplication
    return res.json({
      did: `did:ethr:${address}`,
      context,
      attributes,
      online_links,
      credentials,
      note: "Content is provided in English. Your browser can translate this page if needed."
    });

  } catch (err) {
    console.error("❌ getProfile error:", err);
    return res.status(500).json({ error: "Internal server error" });
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

    const subjectAddress = owner.toLowerCase();

    const oldCid = await registry.getProfileCID(subjectAddress);
    if (oldCid && oldCid.length > 0) {
      await unpinCID(oldCid).catch(() => {}); // best-effort
    }

    // Use per-request JWT for tombstone upload
    const pinataJwt = getPinataJwtForRequest(req);

    const tombstone = {
      id: `did:ethr:${subjectAddress}`,
      erased: true,
      erasedAt: new Date().toISOString()
    };

    const ipfsUri = await uploadJSON(tombstone, pinataJwt);
    const newCid = ipfsUri.replace("ipfs://", "");

    await (await registry.setProfileCID(subjectAddress, newCid)).wait();

    return res.json({
      message: "✅ Profile erased (GDPR compliant)",
      newCid
    });
  } catch (err) {
    console.error("❌ eraseProfile error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
};