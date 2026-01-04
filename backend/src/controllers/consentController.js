// backend/src/controllers/consentController.js
import { pool } from "../utils/db.js";

/**
 * Normalize DID → address
 */
const didToAddress = (didOrAddress) => {
  if (!didOrAddress) return didOrAddress;
  if (didOrAddress.startsWith("did:")) {
    return didOrAddress.split(":").pop();
  }
  return didOrAddress;
};

/**
 * Grant consent (GDPR Art.6, Art.7)
 */
export const grantConsent = async (req, res) => {
  try {
    const { owner, claimId, purpose, context, expiresAt } = req.body;

    if (!owner || !claimId || !purpose || !context) {
      return res.status(400).json({
        error: "owner, claimId, purpose, and context are required"
      });
    }

    const subjectAddress = didToAddress(owner);

    /**
     * 🚫 Prevent duplicate active consent
     * Same subject + claim + context
     */
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
      [subjectAddress, claimId, context]
    );

    if (existing.rowCount > 0) {
      return res.status(409).json({
        error: "Active consent already exists for this attribute in this context",
        claimId,
        context
      });
    }

    /**
     * ✅ Insert new consent
     */
    await pool.query(
      `
      INSERT INTO consents
        (subject_did, claim_id, purpose, context, expires_at)
      VALUES ($1, $2, $3, $4, $5)
      `,
      [subjectAddress, claimId, purpose, context, expiresAt || null]
    );

    return res.json({
      message: "✅ Consent recorded",
      subject_did: subjectAddress,
      claimId,
      purpose,
      context
    });

  } catch (err) {
    console.error("❌ grantConsent error:", err);
    res.status(500).json({ error: err.message });
  }
};

/**
 * Revoke consent (GDPR Art.7(3))
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

    if (context) {
      query += ` AND context = $${params.length + 1}`;
      params.push(context);
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
 * Get active (non-revoked) consents for a subject (optional context filter)
 * GET /api/consent/active/:owner/:context?
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

    if (context && context !== "undefined" && context.trim() !== "") {
      query += ` AND context = $2`;
      params.push(context);
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
