import express from "express";
import {
  grantConsent,
  revokeConsent,
  getActiveConsents  // ← NEW import
} from "../controllers/consentController.js";

const router = express.Router();

router.post("/grant", grantConsent);
router.post("/revoke", revokeConsent);

// NEW: Get active consents (with optional context)
router.get("/active/:owner/:context?", getActiveConsents);
// If no context: /active/:owner
// With context: /active/:owner/personal

export default router;