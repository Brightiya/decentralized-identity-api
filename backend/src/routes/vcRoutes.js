/**
import express from "express";
import contract from "../utils/contract.js";
import { issueVC, verifyVC } from "../controllers/vcController.js";

const router = express.Router();

// Example route: register a new identity
router.post("/register", async (req, res) => {
  try {
    const { userAddress, metadata } = req.body;
    const tx = await contract.registerIdentity(metadata);
    await tx.wait();
    res.json({ success: true, txHash: tx.hash });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Example route: get an identity
router.get("/identity/:address", async (req, res) => {
  try {
    const identity = await contract.getIdentity(req.params.address);
    res.json({ identity });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// backend/src/routes/vcRoutes.js
router.get("/profile/:address", async (req, res) => {
  try {
    const { address } = req.params;
    const profileCID = await contract.getProfileCID(address);
    res.json({ address, profileCID });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

router.post("/issue", issueVC);
router.post("/verify", verifyVC);


export default router;
*/
  
import express from "express";
import { issueVC, verifyVC, validateRawVC } from "../controllers/vcController.js";
import { contextMiddleware } from "../../middleware/context.js";

const router = express.Router();

/**
 * Issue a Verifiable Credential
 * Supports:
 * - Context-aware disclosure
 * - GDPR consent metadata
 */
router.post(
  "/issue",
  contextMiddleware,
  issueVC
);


 // Verify a Verifiable Credential
 // - Signature verification
 // - On-chain hash verification
 
router.post("/verify", verifyVC);
router.post("/validate", validateRawVC);

export default router;
