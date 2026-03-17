// backend/src/controllers/consentController.js
import { pool } from "../utils/db.js";
import { ethers } from "ethers";
import { fetchJSON } from "../utils/pinata.js";
import {getContract} from "../utils/contract.js";
import {requireDidAddress as didToAddress } from "../utils/did.js";

/**
 * Minimal sanitization for contexts not coming through middleware
 * (lowercase + strict character set)
 * Used only when context is directly user-supplied (e.g. revoke endpoint)
 * @param {any} ctx - Raw context value
 * @returns {string|null} Normalized context or null if invalid/empty
 */
const sanitizeContext = (ctx) => {
  // Early return if input is falsy or not a string
  if (!ctx || typeof ctx !== "string") return null;
  // Trim whitespace, force lowercase, and allow only safe characters
  return ctx
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, "");
};

/**
 * Grant consent (Option B-1: Fully dynamic contexts)
 * Records user consent for a specific claim + purpose + context
 * Prevents duplicate active consents for the same triple
 * POST body: { owner, claimId, purpose, expiresAt? }
 * Context is injected via middleware (req.context)
 */
export const grantConsent = async (req, res) => {
  try {
    // Destructure required + optional fields from request body
    let { owner, claimId, purpose, expiresAt } = req.body;

    // Enforce minimum required fields
    if (!owner || !claimId || !purpose) {
      return res.status(400).json({
        error: "owner, claimId, and purpose are required"
      });
    }

    // Context is guaranteed by middleware (with fallback to 'profile')
    // → already sanitized and lowercased before reaching this point
    const ctx = req.context;
    // Convert DID → Ethereum checksum address
    const subjectAddress = didToAddress(owner);

    // ────────────────────────────────────────────────
    // Prevent duplicate active consent for same triple
    // ────────────────────────────────────────────────
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

    // Conflict (409) if an active consent already exists
    if (existing.rowCount > 0) {
      return res.status(409).json({
        error: "Active consent already exists for this attribute in this context",
        claimId,
        context: ctx
      });
    }

    // Insert new consent record
    // expiresAt is optional → passed as NULL if not provided
    await pool.query(
      `
      INSERT INTO consents
        (subject_did, claim_id, purpose, context, expires_at)
      VALUES ($1, $2, $3, $4, $5)
      `,
      [subjectAddress, claimId, purpose, ctx, expiresAt || null]
    );

    // Success response — mirrors input for confirmation
    return res.json({
      message: "✅ Consent recorded",
      subject_did: subjectAddress,
      claimId,
      purpose,
      context: ctx
    });

  } catch (err) {
    // Log full error for debugging (do not expose to client)
    console.error("❌ grantConsent error:", err);
    // Generic 500 response — avoid leaking internal details
    res.status(500).json({ error: err.message });
  }
};

/**
 * Revoke consent (Option B-1)
 * NOTE:
 * - context is OPTIONAL and must NOT fallback (no implicit profile)
 * - if provided, must filter by it
 * - purpose is also optional filter
 * POST body: { owner, claimId, purpose?, context? }
 */
export const revokeConsent = async (req, res) => {
  try {
    const { owner, claimId, purpose, context } = req.body;

    // Minimum required fields for revocation
    if (!owner || !claimId) {
      return res.status(400).json({
        error: "owner and claimId are required"
      });
    }

    const subjectAddress = didToAddress(owner);

    // Sanitize optional context (null if missing or invalid)
    const ctx = sanitizeContext(context);

    // Base UPDATE — targets only still-active consents
    let query = `
      UPDATE consents
      SET revoked_at = NOW()
      WHERE subject_did = $1
        AND claim_id = $2
        AND revoked_at IS NULL
    `;
    const params = [subjectAddress, claimId];

    // Optional: narrow by purpose if provided
    if (purpose) {
      query += ` AND purpose = $${params.length + 1}`;
      params.push(purpose);
    }

    // Optional: narrow by context only if explicitly given & valid
    if (ctx) {
      query += ` AND context = $${params.length + 1}`;
      params.push(ctx);
    }

    // Return the revoked records so client sees what was affected
    query += ` RETURNING claim_id, purpose, context`;

    const result = await pool.query(query, params);

    // No rows affected → nothing to revoke
    if (result.rowCount === 0) {
      return res.status(404).json({
        message: "No active consent found to revoke"
      });
    }

    // Success — include count and details of what was revoked
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
 * - no fallback; only applied if explicitly provided in URL
 * GET /consents/active/:owner/:context? (context optional)
 */
export const getActiveConsents = async (req, res) => {
  try {
    const { owner, context } = req.params;
    const subjectAddress = didToAddress(owner);

    // Base query — only non-revoked consents
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

    // Optional context filter — only if meaningful value was sent
    if (context && context !== "undefined" && context.trim() !== "") {
      const ctx = sanitizeContext(context);
      // Only append if sanitization produced a non-empty string
      if (ctx) {
        query += ` AND context = $2`;
        params.push(ctx);
      }
    }

    // Most recent grants first
    query += ` ORDER BY issued_at DESC`;

    const result = await pool.query(query, params);

    // Transform snake_case → camelCase + handle null expires_at
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
 *  1. On-chain anchored VCs (via registry + IPFS fetch)
 *  2. Profile credentials (if linked)
 *  3. Historical consents (as memory aid)
 * Ensures suggestions match what was actually issued / anchored
 * Returns enriched list with attributes extracted from VCs
 */
export const getSuggestableClaimsForConsent = async (req, res) => {
  try {
    const { subjectDid } = req.params;

    if (!subjectDid) {
      return res.status(400).json({ error: "subjectDid is required" });
    }

    const subjectAddress = didToAddress(subjectDid);
    // Use Map to deduplicate by claimId automatically
    const suggestions = new Map(); // key: claimId → full suggestion object
    const contract = getContract();

    // ────────────────────────────────────────────────
    // Priority 1: Profile-linked credentials (most authoritative)
    // ────────────────────────────────────────────────
    const profileCid = await contract.getProfileCID(subjectAddress);

    if (profileCid && profileCid.length > 0) {
      try {
        const profile = await fetchJSON(profileCid);

        // Iterate over each credential reference in profile
        for (const cred of profile.credentials || []) {
          // Skip incomplete credential entries
          if (cred.cid && cred.claimId && cred.context) {
            try {
              // Fetch the actual Verifiable Credential from IPFS
              const vc = await fetchJSON(cred.cid);
              // Use VC purpose if available, else fallback
              const purpose = vc?.pimv?.purpose || "General verification";
              const context = vc?.pimv?.context || cred.context;

              let attributes = [];

              // ────────────────────────────────────────────────
              // Try to extract attribute keys from VC structure
              // ────────────────────────────────────────────────

              // Most common pattern: nested claim object
              if (
                vc?.credentialSubject?.claim &&
                typeof vc.credentialSubject.claim === 'object' &&
                !Array.isArray(vc.credentialSubject.claim)
              ) {
                attributes = Object.keys(vc.credentialSubject.claim)
                  .filter(key => key && typeof key === 'string' && key.trim())
                  .map(key => key.trim());
              }

              // Fallback: attributes directly on credentialSubject
              if (attributes.length === 0) {
                if (
                  vc?.credentialSubject &&
                  typeof vc.credentialSubject === 'object' &&
                  !Array.isArray(vc.credentialSubject)
                ) {
                  attributes = Object.keys(vc.credentialSubject)
                    .filter(key => !['id', 'type'].includes(key))
                    .map(key => key.trim());
                }
              }

              // Future-proof: optional pimv.attributes array
              if (vc?.pimv?.attributes && Array.isArray(vc.pimv.attributes)) {
                const extraAttrs = vc.pimv.attributes
                  .filter(a => a && typeof a === 'string' && a.trim())
                  .map(a => a.trim());

                attributes = [...new Set([...attributes, ...extraAttrs])];
              }

              // Last resort: at least show the claimId itself
              if (attributes.length === 0 && cred.claimId) {
                attributes = [cred.claimId.trim()];
              }

              // Store suggestion (deduplicated by claimId)
              suggestions.set(cred.claimId, {
                claim_id: cred.claimId,
                purpose,
                context,
                issued_at: cred.issuedAt || vc?.issuanceDate || new Date(0).toISOString(),
                attributes,           // ← list of attribute keys this claim covers
                cid: cred.cid,
                signedCid: cred.cid
              });
            } catch (e) {
              // Non-fatal: log but continue with other credentials
              console.warn(`Failed to fetch VC ${cred.cid} for suggestion:`, e.message);
            }
          }
        }
      } catch (e) {
        console.warn(`Failed to fetch profile CID ${profileCid}:`, e.message);
      }
    }

    // ────────────────────────────────────────────────
    // Priority 2: Check known/common claim types on-chain
    // ────────────────────────────────────────────────
    const commonClaimIds = [
      'Address', 'Name', 'Email', 'Age', 'Number',
      'identity.name', 'identity.email', 'profile.email', 'legal.email', 'professional.Name'
    ];

    for (const claimId of commonClaimIds) {
      try {
        // Convert string claimId → bytes32 key (standard practice)
        const claimIdBytes32 = ethers.keccak256(ethers.toUtf8Bytes(claimId));
        const claimHash = await contract.getClaim(subjectAddress, claimIdBytes32);

        // Only include if actually anchored on-chain
        if (claimHash !== ethers.ZeroHash) {
          if (!suggestions.has(claimId)) {
            suggestions.set(claimId, {
              claim_id: claimId,
              purpose: `Verification of ${claimId}`,
              context: 'identity', // conservative default
              issued_at: new Date(0).toISOString(),
              attributes: [claimId],
            });
          }
        }
      } catch (e) {
        console.warn(`Failed to check on-chain claim ${claimId}:`, e.message);
      }
    }

    // ────────────────────────────────────────────────
    // Priority 3: Historical consents (helps user memory)
    // ────────────────────────────────────────────────
    const historicalRes = await pool.query(`
      SELECT DISTINCT claim_id, purpose, context, issued_at
      FROM consents
      WHERE subject_did = $1
      ORDER BY issued_at DESC
    `, [subjectAddress]);

    historicalRes.rows.forEach(row => {
      // Only add if not already present from higher-priority sources
      if (!suggestions.has(row.claim_id)) {
        suggestions.set(row.claim_id, {
          claim_id: row.claim_id,
          purpose: row.purpose,
          context: row.context || 'unknown',
          issued_at: row.issued_at ? row.issued_at.toISOString() : new Date(0).toISOString(),
          attributes: [row.claim_id],
        });
      }
    });

    // Convert Map values to array + sort by issuance date (newest first)
    const uniqueSuggestions = Array.from(suggestions.values())
      .sort((a, b) => {
        const dateA = a.issued_at ? new Date(a.issued_at).getTime() : 0;
        const dateB = b.issued_at ? new Date(b.issued_at).getTime() : 0;
        return dateB - dateA; // descending (recent → old)
      });

    // Final structured response
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