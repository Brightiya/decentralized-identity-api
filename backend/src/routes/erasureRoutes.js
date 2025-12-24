import express from "express";
import { eraseSubjectData } from "../controllers/erasureController.js";

const router = express.Router();

/**
 * GDPR Art.17 — Right to Erasure
 */
router.post("/erase", eraseSubjectData);

export default router;
