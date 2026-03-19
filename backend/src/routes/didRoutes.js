// backend/src/routes/didRoutes.js

// Import the Express framework to define route handlers
import express from "express";

// Import controller functions responsible for DID (Decentralized Identifier) operations
import { 
  registerDID, // Handles the creation/registration of a new DID
  resolveDID,  // Handles resolving a DID (or address) to its associated data/document
  verifyDID    // Handles verification of a DID (e.g., signature or ownership validation)
} from "../controllers/didController.js";

// Create a new Express router instance for modular route definitions
const router = express.Router();


// ────────────────────────────────────────────────
// DID (Decentralized Identifier) Routes
// ────────────────────────────────────────────────


// Route: POST /register
// Description:
// Registers a new Decentralized Identifier (DID).
// This typically involves associating a blockchain address or identity
// with a DID document and storing or anchoring it (e.g., on-chain or via IPFS).
//
// Expected Use Case:
// - A user creates a new identity within the system
// - The backend generates or stores the corresponding DID document
router.post("/register", registerDID);


// Route: GET /:address
// Description:
// Resolves a DID or blockchain address to its associated DID document.
//
// The `:address` parameter represents a unique identifier (e.g., Ethereum address).
// The controller retrieves the corresponding DID data, which may include:
// - Public keys
// - Metadata
// - Associated claims or credentials
//
// Example:
// GET /did/0x123...abc
router.get("/:address", resolveDID);


// Route: POST /verify
// Description:
// Verifies the validity of a DID.
// This may involve:
// - Checking cryptographic signatures
// - Validating ownership of a DID
// - Ensuring integrity of associated data
//
// Expected Use Case:
// - Confirm that a DID belongs to a user
// - Validate signed messages or credentials
router.post("/verify", verifyDID);


// Export the router so it can be mounted in the main application
// (e.g., under /api/did in index.js)
export default router;