// backend/src/routes/routeTest.js (or testRoutes.js)
import { Router } from "express";
import { authMiddleware } from "../../middleware/auth.js";
import { gdprConsentMiddleware } from "../../middleware/gdprConsent.js";
import { pinataUserAuth } from "../../middleware/pinataUserAuth.js";
import { asyncHandler } from "../utils/asyncHandler.js"; // ← NEW IMPORT

const router = Router();

// ─── Basic Auth Test Routes ────────────────────────────────────────────────
router.get("/test/auth-required", authMiddleware, (req, res) => {
  return res.status(200).json({
    success: true,
    user: {
      ethAddress: req.user.ethAddress,
      role: req.user.role,
      did: req.user.did
    }
  });
});

router.get("/test/user-or-admin", authMiddleware, (req, res) => {
  return res.status(200).json({ role: req.user.role });
});

router.get("/test/admin-only", authMiddleware, (req, res) => {
  if (req.user.role !== "ADMIN") {
    return res.status(403).json({
      error: "Insufficient permissions",
      requiredRoles: ["ADMIN"]
    });
  }
  return res.status(200).json({ success: true, role: "ADMIN" });
});

// ─── Pinata JWT Test Route ─────────────────────────────────────────────────
router.get("/test/pinata", pinataUserAuth, (req, res) => {
  return res.status(200).json({ pinataJwt: req.pinataJwt });
});

const setTestContext = (req, res, next) => {
  req.context = req.body.context || req.query.context || 'profile';
  next();
};

// ─── Self-Read Test Route (with consent bypass for self) ───────────────────
router.get(
  "/test/self-read/:address",
  authMiddleware,
  setTestContext,
  gdprConsentMiddleware, // ← already async, but Express will handle if wrapped elsewhere
  asyncHandler(async (req, res) => {  // ← WRAP HERE
    return res.status(200).json({
      success: true,
      consent: {
        granted: true,
        selfRead: true
      }
    });
  })
);

// ─── Protected Test Route (full consent enforcement) ───────────────────────
router.post(
  "/test/protected",
  authMiddleware,
  setTestContext,
  gdprConsentMiddleware,
  asyncHandler(async (req, res) => {  // ← WRAP HERE
    return res.status(200).json({
      success: true,
      consent: req.consent || { claims: [], allClaims: true }
    });
  })
);

router.get(
  "/test/protected-query",
  authMiddleware,
  setTestContext,
  gdprConsentMiddleware,
  asyncHandler(async (req, res) => {  // ← WRAP HERE
    return res.status(200).json({ success: true });
  })
);

export default router;