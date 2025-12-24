import { ethers } from "ethers";

/**
 * Wallet-based authentication middleware
 *
 * Requires headers:
 *  - x-did: did:ethr:<address>
 *  - x-signature: signed message proving DID ownership
 *
 * Message format (must match frontend):
 *  "Authorize GDPR action for <did>"
 */
export const authMiddleware = async (req, res, next) => {
  try {
    const did = req.headers["x-did"];
    const signature = req.headers["x-signature"];

    if (!did || !signature) {
      return res.status(401).json({
        error: "Authentication required (DID + signature)"
      });
    }

    // Extract Ethereum address from DID
    const address = did.split(":").pop();
    if (!ethers.isAddress(address)) {
      return res.status(400).json({
        error: "Invalid DID format"
      });
    }

    // Expected signed message
    const message = `Authorize GDPR action for ${did}`;

    // Recover signer from signature
    const recovered = ethers.verifyMessage(message, signature);

    if (recovered.toLowerCase() !== address.toLowerCase()) {
      return res.status(403).json({
        error: "Signature verification failed"
      });
    }

    // Attach auth context to request
    req.auth = {
      did,
      address
    };

    next();

  } catch (err) {
    console.error("❌ Auth middleware error:", err);
    return res.status(500).json({ error: "Authentication failed" });
  }
};
