//import { pool } from "../utils/db.js"
import {pool} from "../src/utils/db.js";

/**
 * GDPR Consent Enforcement Middleware
 * 
 * Checks for active (non-revoked, unexpired) consent for the requested context
 * and claim(s). Attaches consent status to req for downstream use.
 * 
 * Special rule: OWNERS can always read their own profile (GET /api/profile/:address)
 * without consent requirement (self-view is not a disclosure).
 * 
 * Required:
 * - req.user (from authMiddleware)
 * - req.context (from contextMiddleware)
 * - Optional: req.body.claimId or req.query.claimId
 * 
 * On success: calls next()
 * On failure: returns 403 with error
 */
export async function gdprConsentMiddleware(req, res, next) {
  try {
    // 1. Require authenticated user
    // Ensure req.user exists and contains an Ethereum address
    if (!req.user?.ethAddress) {
      return res.status(401).json({
        error: "Authentication required for consent check"
      });
    }

    // Construct subject DID from authenticated Ethereum address
    const subjectDid = `did:ethr:${req.user.ethAddress.toLowerCase()}`;

    // Determine context (defaults to 'default' if not provided)
    const context = req.context || 'default';

    // SPECIAL RULE: Allow self-read of own profile without consent check
    if (req.method === 'GET' && req.path.startsWith('/api/profile/')) {
      // Extract requested profile address from route params
      const requestedAddress = req.params.address?.toLowerCase();

      // Extract authenticated user's address
      const requesterAddress = req.user.ethAddress.toLowerCase();

      // If user is requesting their own profile → allow without consent
      if (requestedAddress === requesterAddress) {
        console.log(`[ConsentMiddleware] Allowing self-read for ${requesterAddress} (no consent required)`);

        // Attach consent info indicating self-read bypass
        req.consent = { granted: true, context, selfRead: true };

        return next(); // Continue to next middleware/handler
      }
    }

    // 2. Determine claimId(s) to check (flexible sources)
    let claimIds = [];

    // From request body (e.g. POST /vc/verify or profile updates)
    if (req.body?.claimId) {
      claimIds.push(req.body.claimId);
    } 
    // Multiple claims from body
    else if (req.body?.claimIds?.length) {
      claimIds = req.body.claimIds;
    }

    // From query parameters (e.g. GET /profile?claimId=...)
    else if (req.query?.claimId) {
      claimIds.push(req.query.claimId);
    }

    // Fallback: if no specific claim → check if ANY active consent exists in context
    if (claimIds.length === 0) {
      const result = await pool.query(
        `
        SELECT 1
        FROM consents
        WHERE subject_did = $1
          AND context = $2
          AND revoked_at IS NULL
          AND (expires_at IS NULL OR expires_at > NOW())
        LIMIT 1
        `,
        [subjectDid, context]
      );

      // If no active consent found → deny access
      if (result.rowCount === 0) {
        return res.status(403).json({
          error: `No valid active consent for context "${context}"`
        });
      }

      // Consent exists → allow access for all claims in context
      req.consent = { granted: true, context, allClaims: true };

      return next();
    }

    // 3. Specific claim(s) check
    const failedClaims = [];

    // Loop through each requested claim and validate consent individually
    for (const claimId of claimIds) {
      const result = await pool.query(
        `
        SELECT 1
        FROM consents
        WHERE subject_did = $1
          AND claim_id = $2
          AND context = $3
          AND revoked_at IS NULL
          AND (expires_at IS NULL OR expires_at > NOW())
        LIMIT 1
        `,
        [subjectDid, claimId, context]
      );

      // If no valid consent found for this claim → mark as failed
      if (result.rowCount === 0) {
        failedClaims.push(claimId);
      }
    }

    // If any claims failed consent validation → deny request
    if (failedClaims.length > 0) {
      return res.status(403).json({
        error: "Missing valid consent for one or more claims",
        failedClaims,
        context
      });
    }

    // 4. Success: attach consent info for downstream controllers
    req.consent = {
      granted: true,
      context,
      claims: claimIds
    };

    // Proceed to next middleware or route handler
    next();

  } catch (err) {
    // Log internal error for debugging
    console.error("❌ gdprConsentMiddleware error:", err.message || err);

    // Return generic error to client (do not expose internal details)
    return res.status(500).json({
      error: "Consent validation failed – please try again"
    });
  }
}