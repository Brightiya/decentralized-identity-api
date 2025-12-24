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
import { getProfile, createOrUpdateProfile } from "../controllers/profileController.js";
import { contextMiddleware } from "../../middleware/context.js";
import { gdprConsentMiddleware } from "../../middleware/gdprConsent.js";


const router = express.Router();

// Create or update profile (vault creation)
router.post("/", createOrUpdateProfile);

// Enforced disclosure read
router.get(
  "/:address",
  contextMiddleware,
  gdprConsentMiddleware,
  getProfile
);

export default router;
 