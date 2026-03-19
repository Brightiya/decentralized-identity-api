// Import Express router
import express from "express";

// Import profile-related controllers
import {
  getProfile,            // Fetch profile from IPFS/blockchain
  createOrUpdateProfile, // Create or update profile (IPFS + chain)
  eraseProfile,          // Handle GDPR erasure
  getDbProfile,          // Fetch profile from database only
  upsertDbProfile        // Create/update DB-only profile
} from "../controllers/profileController.js";

// Import middleware
import { contextMiddleware } from "../../middleware/context.js";     // Inject request context
import { pinataUserAuth } from "../../middleware/pinataUserAuth.js"; // Handle Pinata auth (IPFS)

// Initialize router
const router = express.Router();

/* --------------------------------------------------
   CREATE / UPDATE PROFILE (IPFS + blockchain)
-------------------------------------------------- */

// Create or update profile using IPFS + blockchain
router.post(
  "/",
  contextMiddleware,
  pinataUserAuth,
  createOrUpdateProfile
);


/* --------------------------------------------------
   READ PROFILE (IPFS + blockchain)
-------------------------------------------------- */

// Get full profile (resolved via IPFS + blockchain)
router.get(
  "/:address",
  contextMiddleware,
  getProfile
);


/* --------------------------------------------------
   GDPR ERASURE (IPFS + blockchain + DB cleanup)
-------------------------------------------------- */

// Delete or anonymize user profile (GDPR Art. 17)
router.delete(
  "/erase",
  contextMiddleware,
  eraseProfile
);


/* --------------------------------------------------
   FAST DATABASE PROFILE ROUTES
   (no chain/IPFS calls)
-------------------------------------------------- */

// Get profile directly from database (faster, no external calls)
router.get(
  "/db/:address",
  contextMiddleware,
  getDbProfile
);

// Create or update database-only profile
router.post(
  "/db",
  contextMiddleware,
  upsertDbProfile
);


// Export router
export default router;