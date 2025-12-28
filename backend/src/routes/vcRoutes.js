import express from "express";
import { issueVC, verifyVC, validateRawVC } from "../controllers/vcController.js";
import { contextMiddleware } from "../../middleware/context.js";

const router = express.Router();

/**
 * Issue a Verifiable Credential
 * Supports:
 * - Context-aware disclosure
 * - GDPR consent metadata
 */
router.post(
  "/issue",
  contextMiddleware,
  issueVC
);


 // Verify a Verifiable Credential
 // - Signature verification
 // - On-chain hash verification
 
router.post("/verify", verifyVC);
router.post("/validate", validateRawVC);

export default router;
