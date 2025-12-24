import { pool } from "../utils/db.js";
import { fetchJSON } from "../utils/pinata.js";
import axios from "axios";

/**
 * GDPR Art. 17 — Right to Erasure
 */
export const eraseSubjectData = async (req, res) => {
  try {
    const { subjectDid, reason } = req.body;

    if (!subjectDid) {
      return res.status(400).json({
        error: "subjectDid required",
      });
    }

    // -----------------------------
    // 1️⃣ Anonymize disclosure logs
    // -----------------------------
    await pool.query(
      `
      UPDATE disclosures
      SET
        subject_did = '[ERASED]',
        claim_id = '[ERASED]',
        purpose = '[ERASED]',
        consent = false
      WHERE subject_did = $1
      `,
      [subjectDid]
    );

    // -----------------------------
    // 2️⃣ Optional: Unpin profile from IPFS
    // -----------------------------
    try {
      const profileCID = await globalThis.registry.getProfileCID(subjectDid);

      if (profileCID && profileCID.length > 0) {
        await axios.delete(
          `https://api.pinata.cloud/pinning/unpin/${profileCID}`,
          {
            headers: {
              Authorization: `Bearer ${process.env.PINATA_JWT}`,
            },
          }
        );
      }
    } catch (e) {
      console.warn("⚠️ IPFS unpin skipped:", e.message);
    }

    // -----------------------------
    // 3️⃣ Replace profile with tombstone
    // -----------------------------
    const tombstoneProfile = {
      id: subjectDid,
      erased: true,
      erasedAt: new Date().toISOString(),
      reason: reason || "GDPR Art.17 request",
    };

    // Upload tombstone (optional but recommended)
    // You may keep CID unset if you want hard silence
    // await uploadJSON(tombstoneProfile);

    return res.json({
      message: "✅ Right to erasure completed",
      subjectDid,
      anonymized: true,
    });
  } catch (err) {
    console.error("❌ eraseSubjectData error:", err);
    return res.status(500).json({ error: err.message });
  }
};
