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
    const { owner, claimId, purpose, expiresAt } = req.body;

    if (!owner || !claimId || !purpose) {
      return res.status(400).json({
        error: "owner, claimId, and purpose are required"
      });
    }

    const subjectAddress = didToAddress(owner);

    await pool.query(
      `
      INSERT INTO consents
        (subject_did, claim_id, purpose, expires_at)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (subject_did, claim_id, purpose)
      WHERE revoked_at IS NULL
      DO UPDATE
        SET issued_at = NOW(),
            expires_at = EXCLUDED.expires_at,
            revoked_at = NULL
      `,
      [subjectAddress, claimId, purpose, expiresAt || null]
    );

    return res.json({
      message: "✅ Consent recorded",
      subject_did: subjectAddress,
      claimId,
      purpose
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
    const { owner, claimId, purpose } = req.body;

    if (!owner || !claimId) {
      return res.status(400).json({
        error: "owner and claimId are required"
      });
    }

    const subjectAddress = didToAddress(owner);

    const result = await pool.query(
      `
      UPDATE consents
      SET revoked_at = NOW()
      WHERE subject_did = $1
        AND claim_id = $2
        AND revoked_at IS NULL
        ${purpose ? "AND purpose = $3" : ""}
      `,
      purpose
        ? [subjectAddress, claimId, purpose]
        : [subjectAddress, claimId]
    );

    return res.json({
      message: "✅ Consent revoked",
      subject_did: subjectAddress,
      claimId,
      revokedCount: result.rowCount
    });

  } catch (err) {
    console.error("❌ revokeConsent error:", err);
    res.status(500).json({ error: err.message });
  }
};
