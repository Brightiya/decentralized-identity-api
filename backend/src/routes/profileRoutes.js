// backend/src/routes/profileRoutes.js

import express from "express";

import {
  getProfile,
  createOrUpdateProfile,
  eraseProfile,
  getDbProfile,
  upsertDbProfile
} from "../controllers/profileController.js";

import { contextMiddleware } from "../../middleware/context.js";
import { pinataUserAuth } from "../../middleware/pinataUserAuth.js";

const router = express.Router();

/* --------------------------------------------------
   CREATE / UPDATE PROFILE (IPFS + blockchain)
-------------------------------------------------- */

router.post(
  "/",
  contextMiddleware,
  pinataUserAuth,
  createOrUpdateProfile
);


/* --------------------------------------------------
   READ PROFILE (IPFS + blockchain)
-------------------------------------------------- */

router.get(
  "/:address",
  contextMiddleware,
  getProfile
);


/* --------------------------------------------------
   GDPR ERASURE (IPFS + blockchain + DB cleanup)
-------------------------------------------------- */

router.delete(
  "/erase",
  contextMiddleware,
  eraseProfile
);


/* --------------------------------------------------
   FAST DATABASE PROFILE ROUTES
   (no chain/IPFS calls)
-------------------------------------------------- */

// Read DB profile (context-aware)
router.get(
  "/db/:address",
  contextMiddleware,
  getDbProfile
);

// Create or update DB profile
router.post(
  "/db",
  contextMiddleware,
  upsertDbProfile
);


export default router;