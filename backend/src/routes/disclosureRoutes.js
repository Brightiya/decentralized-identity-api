// backend/src/routes/disclosureRoutes.js
import express from "express";
import {
  getDisclosuresBySubject,
  exportDisclosuresForSubject
} from "../controllers/disclosureController.js";

const router = express.Router();

// GDPR Art. 15 — subject access
router.get("/subject/:subjectDid", getDisclosuresBySubject);

// ✅ GDPR Art. 15 export
// Administrative / API-only GDPR export (not used by UI)
router.get("/:did/export", exportDisclosuresForSubject);

export default router;
