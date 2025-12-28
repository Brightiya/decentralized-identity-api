import express from "express";
import {
  grantConsent,
  revokeConsent
} from "../controllers/consentController.js";

const router = express.Router();

router.post("/grant", grantConsent);
/**
 * GDPR Art.7(3) — Withdraw consent
 */
router.post("/revoke", revokeConsent);

export default router;
