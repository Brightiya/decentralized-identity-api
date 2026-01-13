import express from "express";
import {
  grantConsent,
  revokeConsent,
  getActiveConsents  // ← NEW import
} from "../controllers/consentController.js";
import { contextMiddleware } from "../../middleware/context.js";

const router = express.Router();

router.post("/grant", contextMiddleware, grantConsent);
router.post("/revoke", contextMiddleware, revokeConsent);

// NEW: Get active consents (with optional context)
router.get("/active/:owner/:context?", getActiveConsents);
// If no context: /active/:owner
// With context: /active/:owner/personal

export default router;