// backend/src/controllers/consentController.js
import { pool } from "../utils/db.js";
import { ethers } from "ethers";
import { fetchJSON } from "../utils/pinata.js";

/**
 * Normalize DID → Ethereum address
 */
const didToAddress = (didOrAddress) => {
  if (!didOrAddress) return didOrAddress;
  if (didOrAddress.startsWith("did:")) {
    return didOrAddress.split(":").pop();
  }
  return didOrAddress;
};

/**
 * Minimal sanitization for contexts not coming through middleware
 * (lowercase + strict character set)
 */
const sanitizeContext = (ctx) => {
  if (!ctx || typeof ctx !== "string") return null;
  return ctx
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, "");
};

/**
 * Grant consent (Option B-1: Fully dynamic contexts)
 */
export const grantConsent = async (req, res) => {
  try {
    let { owner, claimId, purpose, expiresAt } = req.body;

    if (!owner || !claimId || !purpose) {
      return res.status(400).json({
        error: "owner, claimId, and purpose are required"
      });
    }

    // Context always available via middleware (fallback → 'profile')
    const ctx = req.context; // already sanitized + lowercase
    const subjectAddress = didToAddress(owner);

    

    // Prevent duplicate active consent
    const existing = await pool.query(
      `
      SELECT id
      FROM consents
      WHERE subject_did = $1
        AND claim_id = $2
        AND context = $3
        AND revoked_at IS NULL
      LIMIT 1
      `,
      [subjectAddress, claimId, ctx]
    );

    if (existing.rowCount > 0) {
      return res.status(409).json({
        error: "Active consent already exists for this attribute in this context",
        claimId,
        context: ctx
      });
    }

    // Insert consent with raw context
    await pool.query(
      `
      INSERT INTO consents
        (subject_did, claim_id, purpose, context, expires_at)
      VALUES ($1, $2, $3, $4, $5)
      `,
      [subjectAddress, claimId, purpose, ctx, expiresAt || null]
    );

    return res.json({
      message: "✅ Consent recorded",
      subject_did: subjectAddress,
      claimId,
      purpose,
      context: ctx
    });

  } catch (err) {
    console.error("❌ grantConsent error:", err);
    res.status(500).json({ error: err.message });
  }
};

/**
 * Revoke consent (Option B-1)
 * NOTE:
 * - context is OPTIONAL and must NOT fallback (no implicit profile)
 * - if provided, must filter by it
 */
export const revokeConsent = async (req, res) => {
  try {
    const { owner, claimId, purpose, context } = req.body;

    if (!owner || !claimId) {
      return res.status(400).json({
        error: "owner and claimId are required"
      });
    }

    const subjectAddress = didToAddress(owner);

    // Optional context — sanitized if present
    const ctx = sanitizeContext(context);

    let query = `
      UPDATE consents
      SET revoked_at = NOW()
      WHERE subject_did = $1
        AND claim_id = $2
        AND revoked_at IS NULL
    `;
    const params = [subjectAddress, claimId];

    if (purpose) {
      query += ` AND purpose = $${params.length + 1}`;
      params.push(purpose);
    }

    if (ctx) {
      query += ` AND context = $${params.length + 1}`;
      params.push(ctx);
    }

    query += ` RETURNING claim_id, purpose, context`;

    const result = await pool.query(query, params);

    if (result.rowCount === 0) {
      return res.status(404).json({
        message: "No active consent found to revoke"
      });
    }

    return res.json({
      message: "✅ Consent revoked",
      subject_did: subjectAddress,
      revokedConsents: result.rows,
      revokedCount: result.rowCount
    });

  } catch (err) {
    console.error("❌ revokeConsent error:", err);
    res.status(500).json({ error: err.message });
  }
};

/**
 * Get active consents (Option B-1)
 * NOTE:
 * - context filter is OPTIONAL
 * - no fallback; only applied if explicitly provided
 */
export const getActiveConsents = async (req, res) => {
  try {
    const { owner, context } = req.params;
    const subjectAddress = didToAddress(owner);

    let query = `
      SELECT
        claim_id,
        purpose,
        context,
        issued_at AS granted_at,
        expires_at
      FROM consents
      WHERE subject_did = $1
        AND revoked_at IS NULL
    `;
    const params = [subjectAddress];

    // Optional context filter
    if (context && context !== "undefined" && context.trim() !== "") {
      const ctx = sanitizeContext(context);
      query += ` AND context = $2`;
      params.push(ctx);
    }

    query += ` ORDER BY issued_at DESC`;

    const result = await pool.query(query, params);

    return res.json(
      result.rows.map(row => ({
        claimId: row.claim_id,
        purpose: row.purpose,
        context: row.context,
        grantedAt: row.granted_at,
        expiresAt: row.expires_at || null
      }))
    );

  } catch (err) {
    console.error("❌ getActiveConsents error:", err);
    res.status(500).json({ error: err.message });
  }
};

/**
 * Get suggestable claimIds, purposes, and contexts for consent granting
 * Pulls real values from:
 *  - On-chain anchored VCs (via registry + IPFS fetch)
 *  - Profile credentials (if linked)
 *  - Historical consents (as memory aid)
 * Ensures suggestions match what was actually issued
 */
export const getSuggestableClaimsForConsent = async (req, res) => {
  try {
    const { subjectDid } = req.params;

    if (!subjectDid) {
      return res.status(400).json({ error: "subjectDid is required" });
    }

    const subjectAddress = didToAddress(subjectDid);
    const suggestions = new Map(); // key: claimId, value: {purpose, context} — avoids duplicates

    // 1. Fetch from profile credentials (best source — links to issued VCs)
    const profileCid = await registry.getProfileCID(subjectAddress);

    if (profileCid && profileCid.length > 0) {
      try {
        const profile = await fetchJSON(profileCid);

        // Extract from credentials array (each has cid, context, claimId)
        for (const cred of profile.credentials || []) {
          if (cred.cid && cred.claimId && cred.context) {
            try {
              const vc = await fetchJSON(cred.cid);
              const purpose = vc?.pimv?.purpose || "General verification";
              const context = vc?.pimv?.context || cred.context;

              suggestions.set(cred.claimId, {
                claim_id: cred.claimId,
                purpose,
                context,
                issued_at: cred.issuedAt || vc?.issuanceDate || new Date(0).toISOString()

              });
            } catch (e) {
              console.warn(`Failed to fetch VC ${cred.cid} for suggestion:`, e.message);
            }
          }
        }
      } catch (e) {
        console.warn(`Failed to fetch profile CID ${profileCid}:`, e.message);
      }
    }

    // 2. Fallback: Scan common claimIds directly from registry (if profile has no credentials)
    const commonClaimIds = [
      'Address', 'Name', 'Email', 'Age', 'Number', 
      'identity.name', 'identity.email', 'profile.email', 'legal.email', 'professional.Name'
    ];

    for (const claimId of commonClaimIds) {
      try {
        const claimIdBytes32 = ethers.keccak256(ethers.toUtf8Bytes(claimId));
        const claimHash = await registry.getClaim(subjectAddress, claimIdBytes32);

        if (claimHash !== ethers.ZeroHash) { // claim is anchored
          // Try to fetch VC from profile or skip to default suggestion
          suggestions.set(claimId, {
            claim_id: claimId,
            purpose: `Verification of ${claimId}`,
            context: 'identity', // default fallback
            issued_at: new Date(0).toISOString()
          });
        }
      } catch (e) {
        console.warn(`Failed to check on-chain claim ${claimId}:`, e.message);
      }
    }

    // 3. Historical consents (as additional memory aid)
    const historicalRes = await pool.query(`
      SELECT DISTINCT claim_id, purpose, context, issued_at
      FROM consents
      WHERE subject_did = $1
      ORDER BY issued_at DESC
    `, [subjectAddress]);

    historicalRes.rows.forEach(row => {
      if (!suggestions.has(row.claim_id)) {
        suggestions.set(row.claim_id, {
          claim_id: row.claim_id,
          purpose: row.purpose,
          context: row.context || 'unknown',
          issued_at: row.issued_at ? row.issued_at.toISOString() : new Date(0).toISOString()

          
        });
      }
    });

    // Convert to array + sort by issued_at DESC (newest first)
const uniqueSuggestions = Array.from(suggestions.values())
  .sort((a, b) => {
    // Use issued_at if available, otherwise fall back to claim_id
    const dateA = a.issued_at ? new Date(a.issued_at).getTime() : 0;
    const dateB = b.issued_at ? new Date(b.issued_at).getTime() : 0;
    return dateB - dateA; // newest first
  });

    return res.json({
      subjectDid,
      suggestableClaims: uniqueSuggestions,
      total: uniqueSuggestions.length,
      sources: [
        "issued VCs (on-chain + IPFS)",
        "profile credentials",
        "historical consents"
      ],
      message: uniqueSuggestions.length > 0
        ? "These are the claims you have issued — select one to grant consent for"
        : "No issued VCs or profile claims found yet — issue a VC first"
    });

  } catch (err) {
    console.error("❌ getSuggestableClaimsForConsent error:", err);
    return res.status(500).json({ error: "Failed to fetch suggestable claims" });
  }
};
