// backend/src/controllers/disclosureController.js
import { pool } from "../utils/db.js";
import { didToAddress } from "../utils/did.js";

// Minimal sanitization for context filters (no remapping, no enums)
const sanitizeContext = (ctx) => {
  if (typeof ctx !== "string") return null;
  const trimmed = ctx.trim();
  // Reject clearly unsafe SQL meta characters
  if (/['";\\]/.test(trimmed)) return null;
  return trimmed;
};

/**
 * GDPR Art. 15 — Subject access to disclosure history
 * Supports optional context filter + pagination
 */
export const getDisclosuresBySubject = async (req, res) => {
  try {
    const { subjectDid } = req.params;
    const { context, limit = 50, offset = 0 } = req.query;

    if (!subjectDid) {
      return res.status(400).json({ error: "subjectDid is required" });
    }

    const subjectAddress = didToAddress(subjectDid);
    const safeContext = context ? sanitizeContext(context) : null;

    let query = `
      SELECT
        id,
        verifier_did,
        claim_id,
        purpose,
        context,
        consent,
        disclosed_at
      FROM disclosures
      WHERE subject_did = $1
    `;
    const params = [subjectAddress];

    if (safeContext) {
      query += ` AND context = $${params.length + 1}`;
      params.push(safeContext);
    }

    query += `
      ORDER BY disclosed_at DESC
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `;
    params.push(parseInt(limit, 10), parseInt(offset, 10));

    const { rows } = await pool.query(query, params);

    // total count for pagination (use let → allow conditional append)
    let countQuery = `
      SELECT COUNT(*) AS total
      FROM disclosures
      WHERE subject_did = $1
    `;
    const countParams = [subjectAddress];

    if (safeContext) {
      countQuery += ` AND context = $2`;
      countParams.push(safeContext);
    }

    const { rows: [{ total }] } = await pool.query(countQuery, countParams);

    return res.json({
      subjectDid,
      subjectAddress,
      totalDisclosures: parseInt(total, 10),
      limit: parseInt(limit, 10),
      offset: parseInt(offset, 10),
      disclosures: rows
    });
  } catch (err) {
    console.error("❌ getDisclosuresBySubject error:", err);
    return res.status(500).json({ error: "Failed to fetch disclosure history" });
  }
};

/**
 * GDPR accountability — verifier audit trail
 */
export const getDisclosuresByVerifier = async (req, res) => {
  try {
    const { verifierDid } = req.params;

    if (!verifierDid) {
      return res.status(400).json({ error: "verifierDid is required" });
    }

    const verifierAddress = didToAddress(verifierDid);

    const { rows } = await pool.query(
      `
      SELECT
        id,
        subject_did,
        claim_id,
        purpose,
        context,
        consent,
        disclosed_at
      FROM disclosures
      WHERE verifier_did = $1
      ORDER BY disclosed_at DESC
      `,
      [verifierAddress]
    );

    return res.json({
      verifierDid,
      verifierAddress,
      totalDisclosures: rows.length,
      disclosures: rows
    });
  } catch (err) {
    console.error("❌ getDisclosuresByVerifier error:", err);
    return res.status(500).json({ error: "Failed to fetch verifier audit trail" });
  }
};

/**
 * Export disclosures for subject (GDPR Art.15 portable export)
 */
export const exportDisclosuresForSubject = async (req, res) => {
  try {
    const { did } = req.params;

    if (!did) {
      return res.status(400).json({ error: "subject DID required" });
    }

    const subjectAddress = didToAddress(did);

    const { rows } = await pool.query(
      `
      SELECT
        id,
        subject_did,
        verifier_did,
        claim_id,
        purpose,
        context,
        consent,
        disclosed_at
      FROM disclosures
      WHERE subject_did = $1
      ORDER BY disclosed_at DESC
      `,
      [subjectAddress]
    );

    return res.json({
      subjectDid: did,
      exportedAt: new Date().toISOString(),
      totalDisclosures: rows.length,
      disclosures: rows
    });
  } catch (err) {
    console.error("❌ exportDisclosuresForSubject error:", err);
    return res.status(500).json({ error: "Failed to export disclosure history" });
  }
};
