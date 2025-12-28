// backend/src/controllers/disclosureController.js
import { pool } from "../utils/db.js";

// reuse helper
const didToAddress = (didOrAddress) => {
  if (!didOrAddress) return didOrAddress;
  if (didOrAddress.startsWith("did:")) {
    return didOrAddress.split(":").pop();
  }
  return didOrAddress;
};

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

     // ✅ Normalize DID → address
    const subjectAddress = didToAddress(subjectDid);

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
      [subjectAddress]
    );

    return res.json({
      subjectDid,
      subjectAddress,
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

     // ✅ Normalize DID → address
     const verifierAddress = didToAddress(verifierDid);

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
      [verifierAddress]
    );

    return res.json({
      verifierDid,
      verifierAddress,
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

    if (!did) {
      return res.status(400).json({ error: "subject DID required" });
    }

    const { rows } = await pool.query(
      `
      SELECT
        id,
        subject_did,
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
      subject_did: did,
      exported_at: new Date().toISOString(),
      total_disclosures: rows.length,
      disclosures: rows
    });
  } catch (err) {
    console.error("❌ exportDisclosuresForSubject error:", err);
    return res.status(500).json({ error: err.message });
  }
};

