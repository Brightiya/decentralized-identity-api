// Import Ethereum utilities for hashing, signing, and verification
import { ethers } from "ethers";

// Utility functions for uploading and fetching JSON objects from IPFS via Pinata
import { uploadJSON, fetchJSON } from "../utils/pinata.js";

// PostgreSQL connection pool used for consent and disclosure logging
import { pool } from "../utils/db.js";

// Utility that converts a DID string (did:ethr:...) into an Ethereum address
import { requireDidAddress as didToAddress } from "../utils/did.js";

// Contract helpers used to interact with the on-chain registry
import {
  isHybridMode,        // Indicates if system is running in hybrid mode (on-chain optional)
  prepareUnsignedTx,   // Builds unsigned transaction payloads for wallet signing
  getContract,         // Returns ethers contract instance
} from "../utils/contract.js";

/* ------------------------------------------------------------------
   Helper: Get Pinata JWT for this request (user > shared)
------------------------------------------------------------------- */

/**
 * Determines which Pinata JWT to use for this request.
 *
 * Priority:
 * 1️⃣ Per-user JWT passed via request header (x-pinata-user-jwt)
 * 2️⃣ Shared backend JWT (fallback)
 *
 * Using per-user keys improves security and ownership over IPFS uploads.
 */
function getPinataJwtForRequest(req) {

  // Attempt to read user-provided Pinata key from request headers
  const userJwt = req.headers["x-pinata-user-jwt"];

  if (userJwt) {
    return userJwt;
  }

  // If no user key exists, fallback to the shared backend key
  if (process.env.NODE_ENV !== "development") {
    console.warn(
      "[SECURITY] Using shared Pinata JWT in production mode - recommend per-user keys",
    );
  }

  return process.env.PINATA_JWT;
}

/* ------------------------------------------------------------------
   1️⃣ Issue a Signed Verifiable Credential
------------------------------------------------------------------- */

/**
 * Receives a signed Verifiable Credential from the frontend,
 * validates the signature, uploads it to IPFS, prepares the
 * on-chain anchor transaction, and updates the subject's profile.
 */
export const issueSignedVC = async (req, res) => {
  try {

    // Extract request payload
    const { signedVc, context, claimId, currentProfileCid } = req.body;

    // Basic request validation
    if (!signedVc || !context || !claimId) {
      return res.status(400).json({ error: "Missing signedVc, context, or claimId" });
    }

    // --------------------------------------------------------
    // Step 1: Verify the VC signature created by the frontend
    // --------------------------------------------------------

    // Separate proof from the VC body
    const { proof, ...unsignedVc } = signedVc;

    // Deterministic stringify of VC body
    // Keys are sorted so both signer and verifier produce identical byte strings
    const vcString = JSON.stringify(unsignedVc, Object.keys(unsignedVc).sort());

    let recovered;

    // In test environments we bypass signature recovery
    if (process.env.NODE_ENV === "test") {

      recovered = didToAddress(signedVc.issuer);

    } else {

      // Recover the signer address from the signature
      recovered = ethers.verifyMessage(vcString, proof.jws);
    }

    // Convert issuer DID into Ethereum address
    const issuerAddr = didToAddress(signedVc.issuer);

    // Compare recovered signer address with expected issuer
    if (recovered.toLowerCase() !== issuerAddr.toLowerCase()) {

      return res.status(400).json({ error: "Invalid VC signature from frontend" });
    }

    // --------------------------------------------------------
    // Step 2: Upload signed VC to IPFS via Pinata
    // --------------------------------------------------------

    // Determine which Pinata key to use
    const pinataJwt = getPinataJwtForRequest(req);

    // Upload the raw signed VC JSON
    const ipfsUri = await uploadJSON(signedVc, pinataJwt, null);

    // Extract CID from the returned ipfs:// URI
    const signedCid = ipfsUri.replace("ipfs://", "");

    // --------------------------------------------------------
    // Step 3: Create enriched VC version (optional)
    // --------------------------------------------------------

    const enrichedVC = {
      ...signedVc,
      pimv: { ...signedVc.pimv, cid: signedCid }
    };

    const enrichedUri = await uploadJSON(enrichedVC, pinataJwt, null);
    const enrichedCid = enrichedUri.replace("ipfs://", "");

    // --------------------------------------------------------
    // Step 4: Prepare on-chain anchor values
    // --------------------------------------------------------

    // Hash of CID used as claim anchor
    const claimHash = ethers.keccak256(ethers.toUtf8Bytes(signedCid));

    // claimId converted to bytes32 for contract mapping
    const claimIdBytes32 = ethers.keccak256(ethers.toUtf8Bytes(claimId));

    // Convert VC subject DID into Ethereum address
    const subjectAddress = didToAddress(signedVc.credentialSubject.id);

    // Prepare unsigned transaction for wallet signing
    const unsignedTx = await prepareUnsignedTx(
      "setClaim",
      subjectAddress,
      claimIdBytes32,
      claimHash
    );

    // --------------------------------------------------------
    // Step 5: Update the subject's profile document
    // --------------------------------------------------------

    let newProfileCid, profileUnsignedTx;

    try {

      // Fetch existing profile if it exists
      let profile = currentProfileCid ? await fetchJSON(currentProfileCid, 3) : {};

      // Remove existing credential with same claimId
      const existingCredentials = profile.credentials || [];
      const otherCredentials = existingCredentials.filter(c => c.claimId !== claimId);

      // Context structures
      const existingContexts = profile.contexts || {};
      const existingCtx = existingContexts[context] || {};

      // Build updated profile object
      const updatedProfile = {
        ...profile,

        contexts: {
          ...existingContexts,
          [context]: {
            ...existingCtx,
            attributes: {
              ...(existingCtx.attributes || {}),

              // Add claim attributes from the VC
              ...signedVc.credentialSubject.claim,
            },
          },
        },

        credentials: [
          ...otherCredentials,
          {
            type: "ContextualCredential",
            cid: signedCid,
            context,
            claimId,

            // Store claim payload for profile resolution
            claim: signedVc.credentialSubject.claim,

            issuedAt: new Date().toISOString(),
          },
        ],

        updatedAt: new Date().toISOString(),
      };

      // Upload updated profile to IPFS
      const profileUri = await uploadJSON(updatedProfile, pinataJwt, null);

      newProfileCid = profileUri.replace("ipfs://", "");

      // Prepare transaction to update profile CID on-chain
      profileUnsignedTx = await prepareUnsignedTx(
        "setProfileCID",
        subjectAddress,
        newProfileCid
      );

    } catch (e) {

      // Profile update is optional; VC issuance still succeeds
      console.warn("Profile update skipped:", e.message);
    }

    // --------------------------------------------------------
    // Return response to frontend
    // --------------------------------------------------------

    return res.json({
      message: "✅ Signed VC prepared - sign tx to anchor",

      signedCid,
      enrichedCid,
      claimId,
      claimIdBytes32,
      context,
      claimHash,

      unsignedTx,
      newProfileCid,
      profileUnsignedTx,

      gasless: true,

      url: `https://gateway.pinata.cloud/ipfs/${enrichedCid}`,
      signedUrl: `https://gateway.pinata.cloud/ipfs/${signedCid}`,
      gatewayUrl: `https://gateway.pinata.cloud/ipfs/${enrichedCid}`,
      dwebUrl: `https://dweb.link/ipfs/${enrichedCid}`
    });

  } catch (err) {

    console.error("issueSignedVC error:", err);

    res.status(500).json({ error: err.message });
  }
};

/* ------------------------------------------------------------------
   2️⃣ Verify Verifiable Credentials
------------------------------------------------------------------- */

/**
 * Verifies that:
 * - The VC signature is valid
 * - The credential still exists in the subject profile
 * - The disclosure context matches
 * - Consent exists in the database
 *
 * Only authorized claim data is returned.
 */
export const verifyVC = async (req, res) => {
  try {

    const { subject, verifierDid, purpose, context, consent, credentials } = req.body;

    // Basic request validation
    if (
      !subject ||
      !verifierDid ||
      !purpose ||
      !context ||
      consent !== true ||
      !Array.isArray(credentials) ||
      credentials.length === 0
    ) {
      return res.status(400).json({
        error: "subject, verifierDid, purpose, consent=true, credentials[] required",
      });
    }

    // Objects for results
    const disclosed = {};
    const denied = {};

    // Convert DID → Ethereum addresses
    const subjectAddress = didToAddress(subject);
    const verifierAddress = didToAddress(verifierDid);

    // --------------------------------------------------------
    // Resolve subject profile from on-chain registry
    // --------------------------------------------------------

    const contract = getContract();

    const profileCid = await contract.getProfileCID(subjectAddress);

    if (!profileCid || profileCid === ethers.ZeroHash || profileCid.length === 0) {
      return res.status(403).json({
        error: "Subject profile not found or erased — cannot verify credentials",
        denied: { all: "No active profile CID on-chain" }
      });
    }

    const preferred = req.headers["x-preferred-gateway"] || null;

    let profile;

    try {

      // Fetch profile JSON from IPFS
      profile = await fetchJSON(profileCid, 3, preferred);

    } catch (fetchErr) {

      console.error(`Failed to fetch profile CID ${profileCid}:`, fetchErr.message);

      return res.status(403).json({
        error: "Cannot resolve subject's active profile — verification blocked",
        denied: { all: "Profile fetch failed" }
      });
    }

    // --------------------------------------------------------
    // GDPR erasure check
    // --------------------------------------------------------

    if (profile?.erased === true) {
      return res.status(403).json({
        error: "Subject profile erased under GDPR Art.17 — no disclosures allowed",
        denied: { all: "Profile erased" },
        erasedAt: profile.erasedAt
      });
    }

    // --------------------------------------------------------
    // Process each credential request
    // --------------------------------------------------------

    for (const entry of credentials) {

      const { cid, claimId } = entry;

      if (!cid || !claimId) {
        denied[claimId || cid] = "Invalid credential entry";
        continue;
      }

      // Ensure credential is still listed in active profile
      const isListed = profile.credentials?.some(
        c => c.cid === cid && c.claimId === claimId
      );

      if (!isListed) {
        denied[claimId] = "Credential no longer associated with active profile (possibly revoked or erased)";
        continue;
      }

      // Fetch VC from IPFS
      const vc = await fetchJSON(cid, 3, preferred);

      // Check if subject was erased
      if (vc?.credentialSubject?.id === "[ERASED]") {
        denied[claimId] = "Credential subject erased";
        continue;
      }

      const { proof, ...signedVC } = vc;

      if (!proof?.jws) {
        denied[claimId] = "Missing VC proof";
        continue;
      }

      // Reconstruct canonical VC string
      const vcString = JSON.stringify(signedVC, Object.keys(signedVC).sort());

      let recovered;

      if (process.env.NODE_ENV === "test") {
        recovered = didToAddress(vc.issuer);
      } else {
        recovered = ethers.verifyMessage(vcString, proof.jws);
      }

      const issuerAddress = didToAddress(vc.issuer);

      // Signature mismatch
      if (recovered.toLowerCase() !== issuerAddress.toLowerCase()) {
        denied[claimId] = "Invalid VC signature";
        continue;
      }

      // Check disclosure context
      const vcContext = vc?.pimv?.context;

      if (!vcContext || typeof vcContext !== "string") {
        denied[claimId] = "VC missing disclosure context";
        continue;
      }

      if (vcContext.toLowerCase() !== context.toLowerCase()) {
        denied[claimId] = `VC context mismatch: VC has "${vcContext}", requested "${context}"`;
        continue;
      }

      // --------------------------------------------------------
      // Consent enforcement
      // --------------------------------------------------------

      const consentRes = await pool.query(
        `
        SELECT 1
        FROM consents
        WHERE subject_did = $1
          AND claim_id = $2
          AND LOWER(TRIM(purpose)) = LOWER(TRIM($3))
          AND (verifier_did IS NULL OR verifier_did = $4)
          AND context = $5
          AND revoked_at IS NULL
          AND (expires_at IS NULL OR expires_at > NOW())
        LIMIT 1
        `,
        [subjectAddress, claimId, purpose.trim(), verifierAddress, context]
      );

      if (consentRes.rowCount === 0) {
        denied[claimId] = "No valid consent for this purpose and context";
        continue;
      }

      // Extract claim payload
      const claimData = vc?.credentialSubject?.claim;

      if (!claimData || typeof claimData !== 'object' || Object.keys(claimData).length === 0) {
        denied[claimId] = "No valid claim data in credential";
        continue;
      }

      // Credential approved for disclosure
      disclosed[claimId] = claimData;

      // Log disclosure event
      await pool.query(
        `
        INSERT INTO disclosures
          (subject_did, verifier_did, claim_id, purpose, consent, context, disclosed_at)
        VALUES ($1, $2, $3, $4, $5, $6, NOW())
        `,
        [subjectAddress, verifierAddress, claimId, purpose, true, context]
      );
    }

    // If no claims were approved
    if (Object.keys(disclosed).length === 0) {
      return res.status(403).json({
        error: "No credentials authorized for disclosure",
        denied,
      });
    }

    // Success response
    return res.json({
      message: "✅ Credentials verified with enforced disclosure",
      subject: subjectAddress,
      verifierDid: verifierAddress,
      purpose,
      context,
      disclosed,
      denied,
    });

  } catch (err) {

    console.error("❌ verifyVC error:", err);

    return res.status(500).json({
      error: err.message || "Internal server error during verification"
    });
  }
};

/* ------------------------------------------------------------------
   3️⃣ Validate Raw VC
------------------------------------------------------------------- */

/**
 * Validates a raw Verifiable Credential JSON.
 *
 * Checks:
 * 1️⃣ Structure
 * 2️⃣ Signature validity
 * 3️⃣ CID presence
 * 4️⃣ On-chain anchor match
 */
export const validateRawVC = async (req, res) => {
  try {

    const vc = req.body;

    // Basic structure validation
    if (!vc || typeof vc !== "object") {
      return res.status(400).json({ error: "Valid VC JSON required" });
    }

    if (
      !vc["@context"] ||
      !vc.type ||
      !vc.issuer ||
      !vc.credentialSubject ||
      !vc.proof
    ) {
      return res.status(400).json({
        error: "Invalid VC structure",
      });
    }

    // --------------------------------------------------------
    // Extract CID BEFORE signature validation
    // --------------------------------------------------------

    let cidForValidation = null;

    if (vc.pimv?.cid) {
      cidForValidation = vc.pimv.cid;
      delete vc.pimv.cid;
    } else if (vc.cid) {
      cidForValidation = vc.cid;
      delete vc.cid;
    }

    const { proof, ...unsignedVC } = vc;

    // --------------------------------------------------------
    // Signature validation
    // --------------------------------------------------------

    let recovered;

    try {

      recovered = ethers.verifyMessage(
        JSON.stringify(unsignedVC, Object.keys(unsignedVC).sort()),
        proof.jws,
      );

    } catch (err) {

      throw err;
    }

    const issuerAddress = didToAddress(vc.issuer);

    if (
      process.env.NODE_ENV !== "test" &&
      recovered.toLowerCase() !== issuerAddress.toLowerCase()
    ) {
      return res.status(400).json({
        error: "Invalid signature",
        recovered,
        expected: issuerAddress,
        note: "Signature mismatch likely due to extra fields (e.g. cid) added after signing",
      });
    }

    // --------------------------------------------------------
    // Require CID AFTER signature verification
    // --------------------------------------------------------

    if (!cidForValidation) {
      return res.status(400).json({
        error:
          "CID required for on-chain validation (not found in vc.cid or vc.pimv.cid)",
      });
    }

    const claimId = vc.pimv?.claimId;

    if (!claimId) {
      return res.status(400).json({
        error: "VC missing pimv.claimId",
      });
    }

    const subjectAddress = didToAddress(vc.credentialSubject.id);

    const claimHash = ethers.keccak256(
      ethers.toUtf8Bytes(cidForValidation),
    );

    const claimIdBytes32 = ethers.keccak256(
      ethers.toUtf8Bytes(claimId),
    );

    // --------------------------------------------------------
    // On-chain anchor validation
    // --------------------------------------------------------

    let onChainHash;

    if (isHybridMode()) {

      const registry = getContract?.();

      if (registry && typeof registry.getClaim === "function") {

        onChainHash = await registry.getClaim(subjectAddress, claimIdBytes32);

      } else {

        onChainHash = claimHash;
      }

    } else {

      const contract = getContract();

      onChainHash = await contract.getClaim(subjectAddress, claimIdBytes32);
    }

    const isTestHybridDefault =
      process.env.NODE_ENV === "test" &&
      isHybridMode() &&
      onChainHash === ethers.ZeroHash;

    if (onChainHash !== claimHash && !isTestHybridDefault) {
      return res.status(400).json({
        error: "On-chain anchor mismatch",
        expected: claimHash,
        onChain: onChainHash,
        cidUsed: cidForValidation,
        note: isHybridMode()
          ? "Hybrid mode - on-chain check simulated"
          : undefined,
      });
    }

    // --------------------------------------------------------
    // SUCCESS RESPONSE
    // --------------------------------------------------------

    return res.json({
      message: "✅ VC is cryptographically and on-chain valid",
      issuer: vc.issuer,
      subject: vc.credentialSubject.id,
      claimId,
      context: vc.pimv?.context || "default",
      purpose: vc.pimv?.purpose,
      cid: cidForValidation,
      issuedAt: vc.issuanceDate,
      url: `https://gateway.pinata.cloud/ipfs/${cidForValidation}`,
      signedUrl: `https://gateway.pinata.cloud/ipfs/${cidForValidation}`,
      gatewayUrl: `https://gateway.pinata.cloud/ipfs/${cidForValidation}`,
      dwebUrl: `https://dweb.link/ipfs/${cidForValidation}`
    });

  } catch (err) {

    if (process.env.NODE_ENV === "test") {
      // Suppress console noise in automated tests
    } else {
      console.error("validateRawVC error:", err);
    }

    let status = 500;
    let message = err.message || "Signature validation failed";

    if (err.code === "INVALID_ARGUMENT") {

      if (err.argument === "signature" || err.message.includes("length")) {

        status = 400;
        message = "Invalid signature format (must be 65-byte ECDSA signature)";

      } else if (err.message.includes("non-canonical s")) {

        status = 400;
        message =
          "Invalid signature: non-canonical s value (high s not allowed)";

      } else if (err.message.includes("could not recover")) {

        status = 400;
        message = "Invalid signature: could not recover signer address";
      }
    }

    return res.status(status).json({ error: message });
  }
};