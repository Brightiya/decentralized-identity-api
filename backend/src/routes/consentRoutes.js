// Import the Express framework to create routing handlers
import express from "express";

// Import controller functions responsible for handling consent-related logic
import {
  grantConsent,                  // Handles granting user consent for specific claims/data
  revokeConsent,                 // Handles revoking previously granted consent
  getActiveConsents,             // Retrieves currently active consents for a user
  getSuggestableClaimsForConsent // Retrieves claims that can be suggested for consent
} from "../controllers/consentController.js";

// Import middleware used to inject or resolve request context (e.g., user DID, request metadata)
import { contextMiddleware } from "../../middleware/context.js";

// Create a new Express router instance to define modular route handlers
const router = express.Router();


// ────────────────────────────────────────────────
// Consent Management Routes
// ────────────────────────────────────────────────

// Route: POST /grant
// Description:
// Grants consent for a specific claim or dataset.
// The contextMiddleware is applied before the controller to ensure
// that the request contains the necessary contextual information
// (e.g., authenticated user, DID, or request metadata).
router.post("/grant", contextMiddleware, grantConsent);


// Route: POST /revoke
// Description:
// Revokes previously granted consent.
// Similar to the grant route, it uses contextMiddleware to ensure
// that the request is properly contextualized before processing.
router.post("/revoke", contextMiddleware, revokeConsent);


// ────────────────────────────────────────────────
// Consent Query Routes
// ────────────────────────────────────────────────

// Route: GET /active/:owner/:context?
// Description:
// Retrieves all active consents for a given owner (user).
// The `:context` parameter is optional and allows filtering
// consents by a specific context (e.g., "personal", "health").
//
// Examples:
// - Without context: /active/:owner
// - With context:    /active/:owner/personal
router.get("/active/:owner/:context?", getActiveConsents);


// Route: GET /suggestable/:subjectDid
// Description:
// Returns a list of claims that can be suggested for consent
// for a given subject DID (Decentralized Identifier).
// This is useful for dynamically recommending consent options
// based on available or missing claims.
router.get('/suggestable/:subjectDid', getSuggestableClaimsForConsent);


// Export the router so it can be mounted in the main application
// (e.g., under /api/consent in index.js)
export default router;