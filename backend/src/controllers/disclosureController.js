// backend/src/controllers/disclosureController.js
import { pool } from "../utils/db.js";

/**
 * GDPR Art. 15 — Subject access to disclosure history
 */
export const getDisclosuresBySubject = async (req, res) => {
  try {
    const { subjectDid } = req.params;

    if (!subjectDid) {
      return res.status(400).json({
        error: "subjectDid is required",
      });
    }

    const { rows } = await pool.query(
      `
      SELECT
        id,
        verifier_did,
        claim_id,
        purpose,
        consent,
        disclosed_at
      FROM disclosures
      WHERE subject_did = $1
      ORDER BY disclosed_at DESC
      `,
      [subjectDid]
    );

    return res.json({
      subjectDid,
      totalDisclosures: rows.length,
      disclosures: rows,
    });
  } catch (err) {
    console.error("❌ getDisclosuresBySubject error:", err);
    return res.status(500).json({ error: err.message });
  }
};

/**
 * GDPR accountability — verifier audit trail
 */
export const getDisclosuresByVerifier = async (req, res) => {
  try {
    const { verifierDid } = req.params;

    if (!verifierDid) {
      return res.status(400).json({
        error: "verifierDid is required",
      });
    }

    const { rows } = await pool.query(
      `
      SELECT
        id,
        subject_did,
        claim_id,
        purpose,
        consent,
        disclosed_at
      FROM disclosures
      WHERE verifier_did = $1
      ORDER BY disclosed_at DESC
      `,
      [verifierDid]
    );

    return res.json({
      verifierDid,
      totalDisclosures: rows.length,
      disclosures: rows,
    });
  } catch (err) {
    console.error("❌ getDisclosuresByVerifier error:", err);
    return res.status(500).json({ error: err.message });
  }
};

export const exportDisclosuresForSubject = async (req, res) => {
  try {
    const { did } = req.params;

    const { rows } = await pool.query(
      `
      SELECT
        verifier_did,
        claim_id,
        purpose,
        consent,
        disclosed_at
      FROM disclosures
      WHERE subject_did = $1
      ORDER BY disclosed_at DESC
      `,
      [did]
    );

    return res.json({
      subjectDid: did,
      exportedAt: new Date().toISOString(),
      disclosures: rows
    });
  } catch (err) {
    console.error("❌ exportDisclosures error:", err);
    res.status(500).json({ error: err.message });
  }
};
