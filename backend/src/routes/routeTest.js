// Import Express Router
import { Router } from "express";

// Import middleware
import { authMiddleware } from "../../middleware/auth.js";          // JWT authentication
import { gdprConsentMiddleware } from "../../middleware/gdprConsent.js"; // GDPR consent enforcement
import { pinataUserAuth } from "../../middleware/pinataUserAuth.js";     // Pinata JWT handling

// Import async error wrapper utility
import { asyncHandler } from "../utils/asyncHandler.js"; // Handles async errors cleanly

// Initialize router
const router = Router();

// ─── Basic Auth Test Routes ────────────────────────────────────────────────

// Test route requiring authentication
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

// Test route returning user role
router.get("/test/user-or-admin", authMiddleware, (req, res) => {
  return res.status(200).json({ role: req.user.role });
});

// Test route restricted to ADMIN role
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

// Test route to verify Pinata JWT injection
router.get("/test/pinata", pinataUserAuth, (req, res) => {
  return res.status(200).json({ pinataJwt: req.pinataJwt });
});

// Middleware to set request context (from body or query)
const setTestContext = (req, res, next) => {
  req.context = req.body.context || req.query.context || 'profile';
  next();
};

// ─── Self-Read Test Route (consent bypass for self-access) ─────────────────

// Allows user to access their own data without full consent enforcement
router.get(
  "/test/self-read/:address",
  authMiddleware,
  setTestContext,
  gdprConsentMiddleware,
  asyncHandler(async (req, res) => {
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

// Requires full consent validation before access
router.post(
  "/test/protected",
  authMiddleware,
  setTestContext,
  gdprConsentMiddleware,
  asyncHandler(async (req, res) => {
    return res.status(200).json({
      success: true,
      consent: req.consent || { claims: [], allClaims: true }
    });
  })
);

// GET version of protected route (query-based)
router.get(
  "/test/protected-query",
  authMiddleware,
  setTestContext,
  gdprConsentMiddleware,
  asyncHandler(async (req, res) => {
    return res.status(200).json({ success: true });
  })
);

// Export router
export default router;