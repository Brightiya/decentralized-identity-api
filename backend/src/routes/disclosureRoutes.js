// backend/src/routes/disclosureRoutes.js

// Import Express router
import express from "express";

// Import disclosure-related controller functions
import {
  getDisclosuresBySubject,     // Retrieve disclosures for a given subject (user)
  getDisclosuresByVerifier,    // Retrieve disclosures made to a specific verifier
  exportDisclosuresForSubject  // Export disclosures data (GDPR compliance)
} from "../controllers/disclosureController.js";

// Initialize router
const router = express.Router();


// ────────────────────────────────────────────────
// Disclosure Routes (GDPR-related)
// ────────────────────────────────────────────────

// GDPR Art. 15 — Subject access
// Get all disclosures related to a specific user (subject DID)
router.get("/subject/:subjectDid", getDisclosuresBySubject);


// GDPR accountability — Verifier audit trail
// Get all disclosures made to a specific verifier
router.get("/verifier/:verifierDid", getDisclosuresByVerifier);


// GDPR Art. 15 — Data export
// Export all disclosures for a subject (API/admin use, not UI-facing)
router.get("/:did/export", exportDisclosuresForSubject);


// Export router for use in main app
export default router;