// backend/src/routes/profileRoutes.js
import express from "express";
import { createOrUpdateProfile, getProfile } from "../controllers/profileController.js";

const router = express.Router();

// Create or update a profile
router.post("/", createOrUpdateProfile);

// Get a profile by address
router.get("/:address", getProfile);

export default router;
