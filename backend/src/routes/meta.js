// Import Express router
import express from 'express';

// Import authentication middleware (protects route)
import { authMiddleware } from '../../middleware/auth.js';

// Import controller handling meta-transactions (GSN relay)
import { relayMetaTx } from '../controllers/metaTxController.js'

// Initialize router
const router = express.Router();


// ────────────────────────────────────────────────
// Meta-Transaction Routes
// ────────────────────────────────────────────────

// POST /relay
// Relays a signed meta-transaction via the backend (requires authentication)
router.post("/relay", authMiddleware, relayMetaTx);


// Export router for integration in main app
export default router;