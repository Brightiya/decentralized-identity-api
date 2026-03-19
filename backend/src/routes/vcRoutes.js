// Import Express router
import express from "express";

// Import Verifiable Credential (VC) controllers
import { 
  verifyVC,        // Verify a credential (e.g., signature/validity)
  validateRawVC,   // Validate structure/format of a raw VC
  issueSignedVC    // Issue and sign a new VC
} from "../controllers/vcController.js";

// Import middleware
import { contextMiddleware } from "../../middleware/context.js";     // Inject request context
import { pinataUserAuth } from "../../middleware/pinataUserAuth.js"; // Handle Pinata auth (IPFS)

// Initialize router
const router = express.Router();
 
// ────────────────────────────────────────────────
// Verifiable Credential (VC) Routes
// ────────────────────────────────────────────────

// Verify an existing credential
router.post("/verify", verifyVC);

// Validate raw VC structure (no signing)
router.post("/validate", validateRawVC);

// Issue and sign a new VC (requires context + IPFS auth)
router.post(
  "/issue-signed",
  contextMiddleware,
  pinataUserAuth,
  issueSignedVC
);

// Export router
export default router;