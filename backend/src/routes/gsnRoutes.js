// backend/src/routes/gsnRoutes.js
import express from 'express';
import { authMiddleware } from '../../middleware/auth.js';
import {
  getGSNConfig,
  getGSNStatus,
  checkGSNWhitelist,
  prepareGSNRegisterIdentityTx,
  prepareGSNSetProfileCIDTx,
  prepareGSNTransactionTx,
  prepareGSNSetClaimTx
} from '../controllers/gsnController.js';

const router = express.Router();

// Public endpoints (no auth required)
router.get('/config', getGSNConfig);
router.get('/status', getGSNStatus);
router.get('/whitelist/:address', checkGSNWhitelist);

// Protected endpoints (require JWT auth)
router.post('/prepare-register-identity', authMiddleware, prepareGSNRegisterIdentityTx);
router.post('/prepare-set-profile-cid', authMiddleware, prepareGSNSetProfileCIDTx);
router.post('/prepare-tx', authMiddleware, prepareGSNTransactionTx);
router.post("/prepare-set-claim",authMiddleware,prepareGSNSetClaimTx);


export default router;