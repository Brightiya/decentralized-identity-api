// backend/src/routes/claimRoutes.js
import express from "express";
import { setClaim, removeClaim, getClaim } from "../controllers/claimController.js";

const router = express.Router();

/**
 * Claim Management Routes
 * Base path: /api/claims
 * --------------------------------------
 * POST   /api/claims/set           → setClaim()
 * GET    /api/claims/:owner/:id    → getClaim()
 * DELETE /api/claims/remove        → removeClaim()
 */

const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

router.post("/set", asyncHandler(setClaim));
router.get("/:owner/:claimId", asyncHandler(getClaim));
router.delete("/remove", asyncHandler(removeClaim));

export default router;
