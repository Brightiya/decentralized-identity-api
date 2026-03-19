// IPFS helper utilities for uploading, fetching, and unpinning JSON objects
import { uploadJSON, fetchJSON, unpinCID } from "../utils/pinata.js";

// PostgreSQL connection pool used for user, profile, and disclosure logging
import { pool } from "../utils/db.js";

// Smart contract helper utilities
import {
  isHybridMode,        // Determines if the system runs in hybrid transaction mode
  prepareUnsignedTx,   // Builds unsigned transactions for frontend wallet signing
  getContract          // Returns ethers.js contract instance
} from "../utils/contract.js";

// Utility to safely convert DID identifiers into Ethereum addresses
import { requireDidAddress as didToAddress } from "../utils/did.js";


/**
 * Determines transaction execution mode.
 *
 * If the request header "x-transaction-mode" equals "gasless",
 * the system prepares transactions accordingly.
 *
 * Otherwise default mode is "normal".
 */
function getTxMode(req) {
  const mode = req.headers['x-transaction-mode'];
  return mode === 'gasless' ? 'gasless' : 'normal';
}


/* ------------------------------------------------------------------
   English labels for translatable fields
------------------------------------------------------------------- */

/**
 * Mapping of gender codes → human-readable English labels.
 *
 * These are used when resolving credential claims into profile attributes
 * so the API response returns standardized labels.
 */
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

/**
 * Determines which Pinata API key should be used.
 *
 * Priority order:
 * 1️⃣ Per-user key supplied via request header
 * 2️⃣ Shared backend key as fallback
 */
function getPinataJwtForRequest(req) {

  const userJwt = req.headers['x-pinata-user-jwt'];

  if (userJwt) {
    return userJwt;
  }

  // If user key is not provided, fallback to backend shared key
  if (process.env.NODE_ENV !== 'development') {
    console.warn('[SECURITY] Using shared Pinata JWT in production mode - recommend per-user keys');
  }

  return process.env.PINATA_JWT;
}


/* ------------------------------------------------------------------
   CREATE / UPDATE PROFILE (MERGED, STATE-SAFE)
------------------------------------------------------------------- */

/**
 * Creates or updates a user's decentralized profile.
 *
 * Behavior:
 * - Merges new data with existing profile state
 * - Stores profile JSON on IPFS
 * - Anchors CID on-chain
 *
 * Works differently depending on system mode:
 * - Hybrid mode → prepares unsigned transaction for wallet signing
 * - Non-hybrid mode → backend signs and submits transaction
 */
export const createOrUpdateProfile = async (req, res) => {
  try {

    // Extract profile fields from request body
    // eslint-disable-next-line no-unused-vars
    const { owner, contexts = {}, credentials = [], attributes = {} } = req.body;

    // Owner address is required
    if (!owner) {
      return res.status(400).json({ error: "owner address required" });
    }

    const subjectAddress = owner.toLowerCase();

    // Variables used to resolve existing profile
    let existingProfile = {};
    let existingCid = null;

    // ----------------------------------------------------
    // Determine current profile CID
    // ----------------------------------------------------

    // Hybrid mode: frontend provides CID
    if (isHybridMode()) {
      existingCid = req.body.currentCid || req.query.currentCid || null;
    } 
    else {
      // Non-hybrid mode: backend reads CID from smart contract
      const contract = getContract();
      existingCid = await contract.getProfileCID(subjectAddress);
    }

    // ----------------------------------------------------
    // Fetch existing profile from IPFS if available
    // ----------------------------------------------------

    if (existingCid && existingCid.length > 0) {
      try {

        const preferred = req.headers['x-preferred-gateway'] || null;

        const existing = await fetchJSON(existingCid, 3, preferred);

        // Prevent recreation if profile was erased under GDPR
        if (existing?.erased === true) {
          return res.status(403).json({
            error: "Profile erased under GDPR Art.17 and cannot be recreated"
          });
        }

        existingProfile = existing;

      } catch {
        // Silent fallback if fetch fails
      }
    }

    // ----------------------------------------------------
    // Merge new data with existing profile
    // ----------------------------------------------------

    const mergedProfile = {

      ...existingProfile,

      // DID identifier for this profile
      id: `did:ethr:${subjectAddress}`,

      // Merge contexts (context-aware attributes)
      contexts: {
        ...(existingProfile.contexts || {}),
        ...contexts
      },

      // Append credentials
      credentials: [
        ...(existingProfile.credentials || []),
        ...credentials
      ],

      // Update timestamp
      updatedAt: new Date().toISOString()
    };

    // ----------------------------------------------------
    // Remove deprecated top-level fields
    // ----------------------------------------------------

    delete mergedProfile.attributes;
    delete mergedProfile.online_links;

    // ----------------------------------------------------
    // Upload merged profile to IPFS
    // ----------------------------------------------------

    const pinataJwt = getPinataJwtForRequest(req);
    const nftStorageKey = req.headers['x-nft-storage-key'] || null;

    const ipfsUri = await uploadJSON(mergedProfile, pinataJwt, nftStorageKey);

    const cid = ipfsUri.replace("ipfs://", "");

    // Prepare default response
    let responseData = {
      message: "✅ Profile merged & stored on IPFS",
      cid,
      ipfsUri
    };

    // ────────────────────────────────
    // HYBRID MODE: Prepare unsigned tx only
    // ────────────────────────────────
    if (isHybridMode()) {

       const txMode = getTxMode(req);

       const unsignedTx = await prepareUnsignedTx(
          txMode,
          'setProfileCID',
          subjectAddress,
          cid
        );

      responseData = {
        ...responseData,
        message: "✅ Profile prepared - please sign & send transaction in your wallet",
        unsignedTx,
        newProfileCid: cid
      };

      console.log('[Hybrid] Prepared unsigned setProfileCID tx');
    } 

    // ────────────────────────────────
    // NON-HYBRID MODE: Backend signs & sends
    // ────────────────────────────────
    else {

      const txMode = getTxMode(req);

      const contract = getContract(txMode);

      const tx = await contract.setProfileCID(subjectAddress, cid);

      await tx.wait();

      responseData.txHash = tx.hash;

      responseData.message = "✅ Profile merged & stored on-chain (backend signed)";

      console.log('[Dev] Backend signed & submitted setProfileCID tx');
    }

    return res.json(responseData);

  } catch (err) {

    console.error("❌ createOrUpdateProfile error:", err);

    return res.status(500).json({ error: err.message || "Failed to create/update profile" });
  }
};


/* ------------------------------------------------------------------
   CONTEXT-AWARE PROFILE READ (RESOLVES VCs → ATTRIBUTES)
------------------------------------------------------------------- */

/**
 * Retrieves a profile and resolves credential claims into attributes.
 *
 * Features:
 * - Context-based attribute resolution
 * - VC claim extraction
 * - Backwards compatibility with older profile formats
 */
export const getProfile = async (req, res) => {
  try {

    const { address } = req.params;

    const context = req.query.context || "profile";

    const subjectAddress = address.toLowerCase();

    if (!address) {
      return res.status(400).json({ error: "address required" });
    }

    const txMode = getTxMode(req);

    const contract = getContract(txMode); // lazy contract resolution

    // Fetch profile CID from blockchain
    const cid = await contract.getProfileCID(subjectAddress);

    // No CID means profile does not exist
    if (!cid || cid.length === 0) {
      return res.status(404).json({ error: "Profile not found" });
    }

    const preferred = req.headers['x-preferred-gateway'] || null;

    const profile = await fetchJSON(cid, 3, preferred);

    // Check if profile was erased under GDPR
    if (profile?.erased === true) {
      return res.status(410).json({
        did: `did:ethr:${address}`,
        erased: true,
        erasedAt: profile.erasedAt,
        message: "Profile erased under GDPR Art.17"
      });
    }

    // Resolve context-specific data
    const ctxData = profile.contexts?.[context] || {};

    // Merge context attributes with legacy attributes
    let attributes = {
      ...ctxData.attributes,
      ...profile.attributes
    };

    // Resolve online links
    let online_links = {
      ...ctxData.online_links,
      ...profile.online_links
    };

    // Filter credentials belonging to the requested context
    const credentials = (profile.credentials || []).filter(
      c => c.context === context
    );

    // ----------------------------------------------------
    // Resolve VC claims into attributes
    // ----------------------------------------------------

    for (const cred of credentials) {
      try {

        let claim = null;

        const preferred = req.headers['x-preferred-gateway'] || null;

        // FAST PATH: use stored claim
        if (cred.claim) {

          claim = cred.claim;

        } else {

          // Fallback: fetch VC from IPFS
          const vc = await fetchJSON(cred.cid, 2, preferred);

          claim = vc?.credentialSubject?.claim;
        }

        if (claim && typeof claim === "object") {

          // Special formatting for gender claim
          if (claim.gender) {

            attributes.gender = {
              code: claim.gender,
              label: genderLabels[claim.gender] || claim.gender
            };

          } else {

            Object.assign(attributes, claim);
          }
        }

      // eslint-disable-next-line no-unused-vars
      } catch (e) {

        console.warn(`⚠️ Failed to resolve VC: ${cred.cid}`);
      }
    }

    // Clean API response
    return res.json({
      did: `did:ethr:${address}`,
      context,
      cid,
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
   GDPR ART.17 — RIGHT TO ERASURE (with audit logging)
------------------------------------------------------------------- */

/**
 * Performs a GDPR Article 17 compliant profile erasure.
 *
 * Steps:
 * 1️⃣ Unpin existing profile CID
 * 2️⃣ Create tombstone profile
 * 3️⃣ Upload tombstone to IPFS
 * 4️⃣ Anchor new CID on-chain
 * 5️⃣ Log erasure event in audit database
 */
export const eraseProfile = async (req, res) => {
  try {

    const { did } = req.body;

    if (!did) {
      return res.status(400).json({ error: "did required" });
    }

    const subjectAddress = didToAddress(did);

    const contract = getContract();

    // Resolve existing profile CID
    const oldCid = await contract.getProfileCID(subjectAddress);

    // ----------------------------------------------------
// Prevent double erasure (profile already erased)
// ----------------------------------------------------

    if (oldCid && oldCid.length > 0) {

      try {

        const existing = await fetchJSON(oldCid, 2);

        if (existing?.erased === true) {

          return res.status(410).json({
            error: "Profile already erased under GDPR Art.17",
            erasedAt: existing.erasedAt
          });

        }

      } catch {

        // If fetch fails, continue (best-effort safety)
      }

    }

    // Best-effort unpin from IPFS
    if (oldCid && oldCid.length > 0) {
      await unpinCID(oldCid).catch(() => {});
    }

    const pinataJwt = getPinataJwtForRequest(req);

    const nftStorageKey = req.headers['x-nft-storage-key'] || null;

    // Tombstone profile object
    const tombstone = {
      id: `did:ethr:${subjectAddress}`,
      erased: true,
      erasedAt: new Date().toISOString()
    };

    // Upload tombstone to IPFS
    const ipfsUri = await uploadJSON(tombstone, pinataJwt, nftStorageKey);

    const newCid = ipfsUri.replace("ipfs://", "");

    let responseData = {
      message: "✅ Profile erased on IPFS",
      newCid
    };

    let txHash;

    // ----------------------------------------------------
    // HYBRID MODE
    // ----------------------------------------------------

    if (isHybridMode()) {

      const txMode = getTxMode(req);

      const unsignedTx = await prepareUnsignedTx(
        txMode,
        'setProfileCID',
        subjectAddress,
        newCid
      );

      responseData = {
        ...responseData,
        message: "✅ Erasure prepared - please sign & send transaction in your wallet",
        unsignedTx
      };

      console.log('[Hybrid] Prepared unsigned setProfileCID (erase) tx');
    } 

    // ----------------------------------------------------
    // DEV / NON-HYBRID MODE
    // ----------------------------------------------------
    else {

      const tx = await contract.setProfileCID(subjectAddress, newCid);

      await tx.wait();

      txHash = tx.hash;

      responseData.txHash = txHash;

      responseData.message = "✅ Profile erased on-chain (backend signed)";

      console.log('[Dev] Backend signed & submitted setProfileCID (erase) tx');
    }

    // ----------------------------------------------------
// Delete off-chain DB profile data (GDPR Art.17 compliance)
// ----------------------------------------------------

      try {

        const userRes = await pool.query(
          'SELECT id FROM users WHERE eth_address = $1',
          [subjectAddress]
        );

        if (userRes.rowCount > 0) {

          const userId = userRes.rows[0].id;

          // Remove all contextual profiles for the user
          await pool.query(
            'DELETE FROM profiles WHERE user_id = $1',
            [userId]
          );

          console.log(`[GDPR] Deleted DB profiles for ${subjectAddress}`);

        }

      } catch (dbErr) {

        console.error(`[GDPR] Failed to delete DB profiles:`, dbErr.message);

      }

    // ----------------------------------------------------
    // Log GDPR erasure event in audit table
    // ----------------------------------------------------

    try {

      await pool.query(
        `
        INSERT INTO disclosures (
          subject_did,
          verifier_did,
          claim_id,
          purpose,
          consent,
          context,
          disclosed_at
        ) VALUES ($1, $2, $3, $4, $5, $6, NOW())
        `,
        [
          subjectAddress,
          "SYSTEM:GDPR",
          "GDPR_ERASURE",
          "Right to Erasure (Article 17)",
          true,
          "compliance"
        ]
      );

      console.log(`[GDPR] Erasure logged to disclosures for ${subjectAddress}`);

    } catch (logErr) {

      console.error(`[GDPR] Failed to log erasure to disclosures:`, logErr.message);
    }

    return res.json(responseData);

  } catch (err) {

    console.error("❌ eraseProfile error:", err);

    return res.status(500).json({ error: err.message || "Internal server error during erasure" });
  }
};


// Get DB profile (fast, no chain/IPFS)
export const getDbProfile = async (req, res) => {
  try {

    const { address } = req.params;

    const context = req.query.context || 'profile';

    const subjectAddress = address.toLowerCase();

    // Lookup user by Ethereum address
    const userRes = await pool.query(
      'SELECT id FROM users WHERE eth_address = $1',
      [subjectAddress]
    );

    if (userRes.rowCount === 0)
      return res.status(404).json({ error: 'User not found' });

    const userId = userRes.rows[0].id;

    // Load profile for given context
    const profileRes = await pool.query(
      'SELECT gender, pronouns, bio, online_links, updated_at, context ' +
      'FROM profiles WHERE user_id = $1 AND context = $2',
      [userId, context]
    );

    if (profileRes.rowCount === 0) {
      return res.status(404).json({ error: 'Profile not found for this context' });
    }

    const profile = profileRes.rows[0];

    res.json({
      address: subjectAddress,
      context: profile.context,
      gender: profile.gender,
      pronouns: profile.pronouns,
      bio: profile.bio,
      online_links: profile.online_links || {},
      updated_at: profile.updated_at,
      source: 'database'
    });

  } catch (err) {

    console.error('getDbProfile error:', err);

    res.status(500).json({ error: 'Failed to load DB profile' });
  }
};


export const upsertDbProfile = async (req, res) => {
  try {

    const { owner, gender, pronouns, bio, online_links, context } = req.body;

    if (!owner)
      return res.status(400).json({ error: 'owner address required' });

    const selectedContext = context || 'profile';

    const subjectAddress = owner.toLowerCase();

    const userRes = await pool.query(
      'SELECT id FROM users WHERE eth_address = $1',
      [subjectAddress]
    );

    if (userRes.rowCount === 0)
      return res.status(404).json({ error: 'User not found' });

    const userId = userRes.rows[0].id;

    // Insert or update profile row
    await pool.query(`
      INSERT INTO profiles (user_id, context, gender, pronouns, bio, online_links, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, NOW())
      ON CONFLICT (user_id, context) DO UPDATE SET
        gender = EXCLUDED.gender,
        pronouns = EXCLUDED.pronouns,
        bio = EXCLUDED.bio,
        online_links = EXCLUDED.online_links,
        updated_at = NOW()
    `, [
      userId,
      selectedContext,
      gender || null,
      pronouns || null,
      bio || null,
      online_links || {}
    ]);

    res.json({
      message: 'Profile updated successfully for context: ' + selectedContext,
      source: 'database'
    });

  } catch (err) {

    console.error('upsertDbProfile error:', err);

    res.status(500).json({ error: 'Failed to update DB profile' });
  }
};