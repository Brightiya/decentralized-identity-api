// backend/src/middleware/gdprConsent.js
import {pool} from '../../backend/src/utils/db.js'

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
    if (!req.user?.ethAddress) {
      return res.status(401).json({
        error: "Authentication required for consent check"
      });
    }

    const subjectDid = `did:ethr:${req.user.ethAddress.toLowerCase()}`;
    const context = req.context || 'default';

    // SPECIAL RULE: Allow self-read of own profile without consent check
    if (req.method === 'GET' && req.path.startsWith('/api/profile/')) {
      const requestedAddress = req.params.address?.toLowerCase();
      const requesterAddress = req.user.ethAddress.toLowerCase();

      if (requestedAddress === requesterAddress) {
        console.log(`[ConsentMiddleware] Allowing self-read for ${requesterAddress} (no consent required)`);
        req.consent = { granted: true, context, selfRead: true };
        return next();
      }
    }

    // 2. Determine claimId(s) to check (flexible sources)
    let claimIds = [];

    // From body (e.g. /vc/verify, /profile/update)
    if (req.body?.claimId) {
      claimIds.push(req.body.claimId);
    } else if (req.body?.claimIds?.length) {
      claimIds = req.body.claimIds;
    }

    // From query (e.g. /profile?claimId=...)
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

      if (result.rowCount === 0) {
        return res.status(403).json({
          error: `No valid active consent for context "${context}"`
        });
      }

      req.consent = { granted: true, context, allClaims: true };
      return next();
    }

    // 3. Specific claim(s) check
    const failedClaims = [];
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

      if (result.rowCount === 0) {
        failedClaims.push(claimId);
      }
    }

    if (failedClaims.length > 0) {
      return res.status(403).json({
        error: "Missing valid consent for one or more claims",
        failedClaims,
        context
      });
    }

    // 4. Success: attach consent info for controllers
    req.consent = {
      granted: true,
      context,
      claims: claimIds
    };

    next();

  } catch (err) {
    console.error("❌ gdprConsentMiddleware error:", err.message || err);
    return res.status(500).json({
      error: "Consent validation failed – please try again"
    });
  }
}