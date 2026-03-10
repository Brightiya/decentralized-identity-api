/**
// backend/src/routes/profileRoutes.js
import express from "express";
import { createOrUpdateProfile, getProfile } from "../controllers/profileController.js";

const router = express.Router();

// Create or update a profile
router.post("/", createOrUpdateProfile);

// Get a profile by address
router.get("/:address", getProfile);

export default router;
*/

import express from "express";
import { getProfile, createOrUpdateProfile, eraseProfile,getDbProfile, upsertDbProfile } from "../controllers/profileController.js";
import { contextMiddleware } from "../../middleware/context.js";
import { pinataUserAuth } from "../../middleware/pinataUserAuth.js";



const router = express.Router();

// Create or update profile (vault creation)
router.post("/", contextMiddleware,pinataUserAuth,createOrUpdateProfile);

// Enforced disclosure read
router.get(
  "/:address",
  contextMiddleware,
  getProfile
);

// Enforced erasure (GDPR Art.17)
router.delete("/erase", contextMiddleware, eraseProfile);

router.get('/db/:address', getDbProfile);
router.post('/db', upsertDbProfile);  // or without pinata if no upload needed

export default router;
 