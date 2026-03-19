import { pool } from "../utils/db.js";
import { didToAddress } from "../utils/did.js";

// Minimal sanitization for context filters (no remapping, no enums)
/**
 * Sanitizes the context query parameter to prevent basic SQL injection patterns.
 * Returns null if the value is invalid or potentially dangerous.
 * Very conservative — rejects quotes, semicolons, backslashes.
 * @param {any} ctx - The context value from query string
 * @returns {string|null} Sanitized context or null if invalid
 */
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
 * @param {import('express').Request} req - Express request object
 * @param {import('express').Response} res - Express response object
 */
export const getDisclosuresBySubject = async (req, res) => {
  try {
    // Extract route parameter and query parameters
    const { subjectDid } = req.params;
    const { context, limit = 50, offset = 0 } = req.query;

    // Basic input validation
    if (!subjectDid) {
      return res.status(400).json({ error: "subjectDid is required" });
    }

    // Convert DID to Ethereum-style address (likely checksummed)
    const subjectAddress = didToAddress(subjectDid);

    // Sanitize optional context filter
    const safeContext = context ? sanitizeContext(context) : null;

    // Base SELECT query — only columns needed for subject view
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

    // Optional context filter (only added if sanitized value exists)
    if (safeContext) {
      query += ` AND context = $${params.length + 1}`;
      params.push(safeContext);
    }

    // Add ordering and pagination (always applied)
    query += `
      ORDER BY disclosed_at DESC
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `;
    params.push(parseInt(limit, 10), parseInt(offset, 10));

    // Execute main data query
    const { rows } = await pool.query(query, params);

    // Separate count query for accurate total (needed for proper pagination UI)
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

    // Get total count (independent of LIMIT/OFFSET)
    const { rows: [{ total }] } = await pool.query(countQuery, countParams);

    // Structured response following common paginated API pattern
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
 * Returns all disclosures made by a specific verifier
 * @param {import('express').Request} req - Express request object
 * @param {import('express').Response} res - Express response object
 */
export const getDisclosuresByVerifier = async (req, res) => {
  try {
    const { verifierDid } = req.params;

    if (!verifierDid) {
      return res.status(400).json({ error: "verifierDid is required" });
    }

    const verifierAddress = didToAddress(verifierDid);

    // Fetch all disclosures performed by this verifier, newest first
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
 * Returns complete disclosure history for data portability / subject copy
 * @param {import('express').Request} req - Express request object
 * @param {import('express').Response} res - Express response object
 */
export const exportDisclosuresForSubject = async (req, res) => {
  try {
    const { did } = req.params;

    if (!did) {
      return res.status(400).json({ error: "subject DID required" });
    }

    const subjectAddress = didToAddress(did);

    // Full history export — includes both subject_did and verifier_did
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

    // Response includes export metadata
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