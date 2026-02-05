// backend/src/controllers/profileController.js
import { uploadJSON, fetchJSON, unpinCID } from "../utils/pinata.js";

import {
  isHybridMode,
  prepareUnsignedTx,
  getContract
} from "../utils/contract.js";

import { requireDidAddress as didToAddress } from "../utils/did.js";


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

    const subjectAddress = owner.toLowerCase();
    const contract = getContract(); // 🔑 lazy, mock-safe

    let existingProfile = {};

    // GDPR HARD STOP — erased profiles cannot be recreated
    const existingCid = await contract.getProfileCID(subjectAddress); // read-only OK
    if (existingCid && existingCid.length > 0) {
      try {
        const preferred = req.headers['x-preferred-gateway'] || null;
        const existing = await fetchJSON(existingCid, 3, preferred);
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

    // Clean old top-level fields
    delete mergedProfile.attributes;
    delete mergedProfile.online_links;

    const pinataJwt = getPinataJwtForRequest(req);
    const nftStorageKey = req.headers['x-nft-storage-key'] || null;

    const ipfsUri = await uploadJSON(mergedProfile, pinataJwt, nftStorageKey);
    const cid = ipfsUri.replace("ipfs://", "");

    let responseData = {
      message: "✅ Profile merged & stored on IPFS",
      cid,
      ipfsUri
    };

    // ────────────────────────────────
    // HYBRID MODE: Prepare unsigned tx
    // ────────────────────────────────
    if (isHybridMode()) {
      const unsignedTx = await prepareUnsignedTx('setProfileCID', subjectAddress, cid);
      responseData = {
        ...responseData,
        message: "✅ Profile prepared - please sign & send transaction in your wallet",
        unsignedTx
      };
      console.log('[Hybrid] Prepared unsigned setProfileCID tx');
    } 
    // ────────────────────────────────
    // DEV MODE: Backend signs
    // ────────────────────────────────
    else {
      const tx = await contract.setProfileCID(subjectAddress, cid);
      await tx.wait();
      responseData.txHash = tx.hash;
      responseData.message = "✅ Profile merged & stored on-chain (backend signed)";
      console.log('[Dev] Backend signed & submitted setProfileCID tx');
    }

    return res.json(responseData);
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
    const context = req.query.context || "profile";

    if (!address) {
      return res.status(400).json({ error: "address required" });
    }

    const contract = getContract(); // 🔑 lazy

    const cid = await contract.getProfileCID(address.toLowerCase());
    if (!cid || cid.length === 0) {
      return res.status(404).json({ error: "Profile not found" });
    }

    const preferred = req.headers['x-preferred-gateway'] || null;
    const profile = await fetchJSON(cid, 3, preferred);

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
        const preferred = req.headers['x-preferred-gateway'] || null;
        const vc = await fetchJSON(cred.cid, 3, preferred);
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
    const { did } = req.body; // ← Matches ApiService payload { did: string }
    if (!did) {
      return res.status(400).json({ error: "did required" });
    }

    const subjectAddress = didToAddress(did);
    const contract = getContract(); // 🔑 lazy, mock-safe

    const oldCid = await contract.getProfileCID(subjectAddress); // read-only OK
    if (oldCid && oldCid.length > 0) {
      await unpinCID(oldCid).catch(() => {}); // best-effort
    }

    const pinataJwt = getPinataJwtForRequest(req);
    const nftStorageKey = req.headers['x-nft-storage-key'] || null;

    const tombstone = {
      id: `did:ethr:${subjectAddress}`,
      erased: true,
      erasedAt: new Date().toISOString()
    };

    const ipfsUri = await uploadJSON(tombstone, pinataJwt, nftStorageKey);
    const newCid = ipfsUri.replace("ipfs://", "");

    let responseData = {
      message: "✅ Profile erased on IPFS",
      newCid
    };

    // ────────────────────────────────
    // HYBRID MODE: Prepare unsigned tx
    // ────────────────────────────────
    if (isHybridMode()) {
      const unsignedTx = await prepareUnsignedTx('setProfileCID', subjectAddress, newCid);
      responseData = {
        ...responseData,
        message: "✅ Erasure prepared - please sign & send transaction in your wallet",
        unsignedTx
      };
      console.log('[Hybrid] Prepared unsigned setProfileCID (erase) tx');
    } 
    // ────────────────────────────────
    // DEV MODE: Backend signs
    // ────────────────────────────────
    else {
      const tx = await contract.setProfileCID(subjectAddress, newCid);
      await tx.wait();
      responseData.txHash = tx.hash;
      responseData.message = "✅ Profile erased on-chain (backend signed)";
      console.log('[Dev] Backend signed & submitted setProfileCID (erase) tx');
    }

    return res.json(responseData);
  } catch (err) {
    console.error("❌ eraseProfile error:", err);
    return res.status(500).json({ error: err.message });
  }
};