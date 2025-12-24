/**
// backend/src/controllers/vcController.js
import { ethers } from "ethers";
import { uploadJSON, fetchJSON } from "../utils/pinata.js";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

dotenv.config();

// Dynamically import contractData.json
const contractData = (async () => {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const contractDataPath = path.resolve(__dirname, "../../src/contractData.json");
  return JSON.parse(await readFile(contractDataPath, "utf8"));
})();

const providerUrl = process.env.PROVIDER_URL || "http://127.0.0.1:8545";
const privateKey = process.env.PRIVATE_KEY;

if (!privateKey) {
  throw new Error("❌ Missing PRIVATE_KEY in .env");
}

const provider = new ethers.JsonRpcProvider(providerUrl);
const signer = new ethers.Wallet(privateKey, provider);

// Initialize registry contract after resolving contractData
(async () => {
  const { address, abi } = await contractData;
  globalThis.registry = new ethers.Contract(address, abi, signer);
})();
// -----------------------------
// 1️⃣ Issue a Verifiable Credential
// -----------------------------
export const issueVC = async (req, res) => {
  try {
    const { issuer, subject, claimId, claim } = req.body;

    if (!issuer || !subject || !claimId || !claim) {
      return res.status(400).json({ error: "issuer, subject, claimId, and claim are required" });
    }

    // 1️⃣ Build VC payload
    const vc = {
      "@context": ["https://www.w3.org/2018/credentials/v1"],
      type: ["VerifiableCredential"],
      issuer,
      issuanceDate: new Date().toISOString(),
      credentialSubject: { id: subject, claim },
    };

    // 2️⃣ Sign VC
    const vcString = JSON.stringify(vc);
    const signature = await signer.signMessage(vcString);
    vc.proof = {
      type: "EcdsaSecp256k1Signature2019",
      created: new Date().toISOString(),
      proofPurpose: "assertionMethod",
      verificationMethod: issuer,
      jws: signature,
    };

    // 3️⃣ Upload VC to IPFS
    const ipfsUri = await uploadJSON(vc);
    const cid = ipfsUri.replace("ipfs://", "");

    // 4️⃣ Compute claimHash (keccak256)
    const claimHash = ethers.keccak256(ethers.toUtf8Bytes(vcString));
    const claimIdBytes32 = ethers.keccak256(ethers.toUtf8Bytes(claimId));

    // 5️⃣ Anchor claimHash on-chain
    const tx = await registry.setClaim(subject, claimIdBytes32, claimHash);
    await tx.wait();

    return res.json({
      message: "✅ VC issued and anchored on-chain",
      cid,
      ipfsUri,
      claimId,
      claimHash,
      txHash: tx.hash,
      gatewayUrl: `https://gateway.pinata.cloud/ipfs/${cid}`,
    });
  } catch (err) {
    console.error("❌ issueVC error:", err);
    res.status(500).json({ error: err.message });
  }


// After anchoring the claim on-chain
try {
  // 6️⃣ Fetch existing profile (if any)
  let currentProfile = {};
  try {
    const profileCID = await registry.getProfileCID(subject);
    if (profileCID && profileCID.length > 0) {
      currentProfile = await fetchJSON(profileCID);
    }
  } catch (e) {
    console.warn(" No existing profile found; creating new one", e);
  }

  // 7️⃣ Append new VC reference
  const newCredential = {
    type: "GenericCredential",
    cid,
    gatewayUrl: `https://gateway.pinata.cloud/ipfs/${cid}`,
    issuedAt: new Date().toISOString(),
  };
  const updatedCredentials = [...(currentProfile.credentials || []), newCredential];

  // 8️⃣ Build updated profile
  const updatedProfile = {
    ...currentProfile,
    id: `did:example:${subject}`,
    credentials: updatedCredentials,
    updatedAt: new Date().toISOString(),
  };

  // 9️⃣ Upload to IPFS
  const profileUri = await uploadJSON(updatedProfile);
  const profileCid = profileUri.replace("ipfs://", "");

  // 🔟 Update profile CID on-chain
  const tx2 = await registry.setProfileCID(subject, profileCid);
  await tx2.wait();

  console.log("✅ Profile auto-updated with new VC:", profileCid);
} catch (updateErr) {
  console.warn("⚠️ Failed to auto-update profile:", updateErr.message);
}
};

// -----------------------------
// 2️⃣ Verify a VC
// -----------------------------
export const verifyVC = async (req, res) => {
  try {
    const { cid, claimId, subject } = req.body;
    if (!cid || !claimId || !subject) {
      return res.status(400).json({ error: "cid, claimId, and subject required" });
    }

    // 1️⃣ Fetch VC JSON from IPFS
    const vc = await fetchJSON(cid);
    const vcString = JSON.stringify({
      "@context": vc["@context"],
      type: vc.type,
      issuer: vc.issuer,
      issuanceDate: vc.issuanceDate,
      credentialSubject: vc.credentialSubject,
    });

    // 2️⃣ Verify signature
    const recovered = ethers.verifyMessage(vcString, vc.proof.jws);
    const validSig = recovered.toLowerCase() === vc.proof.verificationMethod.toLowerCase();

    // 3️⃣ Recompute claimHash
    const claimHash = ethers.keccak256(ethers.toUtf8Bytes(vcString));
    const claimIdBytes32 = ethers.keccak256(ethers.toUtf8Bytes(claimId));

    // 4️⃣ Fetch on-chain claimHash
    const onChainHash = await registry.getClaim(subject, claimIdBytes32);
    const validOnChain = onChainHash === claimHash;

    return res.json({
      message: validSig && validOnChain ? "✅ VC is valid and matches on-chain" : "❌ VC invalid or tampered",
      validSig,
      validOnChain,
      issuer: vc.issuer,
      subject,
      recovered,
      onChainHash,
      localHash: claimHash,
      credential: vc,
    });
  } catch (err) {
    console.error("❌ verifyVC error:", err);
    res.status(500).json({ error: err.message });
  }
};
*/

 // backend/src/controllers/vcController.js
import { ethers } from "ethers";
import { uploadJSON, fetchJSON } from "../utils/pinata.js";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import { pool } from "../utils/db.js";

dotenv.config();

/**  ------------------------------------------------------------------
   Contract bootstrap
------------------------------------------------------------------- */

const contractData = (async () => {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const contractDataPath = path.resolve(
    __dirname,
    "../../src/contractData.json"
  );
  return JSON.parse(await readFile(contractDataPath, "utf8"));
})();

const providerUrl = process.env.PROVIDER_URL || "http://127.0.0.1:8545";
const privateKey = process.env.PRIVATE_KEY;

if (!privateKey) {
  throw new Error("❌ Missing PRIVATE_KEY in .env");
}

const provider = new ethers.JsonRpcProvider(providerUrl);
const signer = new ethers.Wallet(privateKey, provider);

(async () => {
  const { address, abi } = await contractData;
  globalThis.registry = new ethers.Contract(address, abi, signer);
})();

  const didToAddress = (didOrAddress) => {
    if (!didOrAddress) return didOrAddress;

    // did:ethr:0xabc...
    if (didOrAddress.startsWith("did:")) {
      return didOrAddress.split(":").pop();
    }

    return didOrAddress;
  };

/* ------------------------------------------------------------------
   1️⃣ Issue Context-Aware Verifiable Credential
------------------------------------------------------------------- */

export const issueVC = async (req, res) => {
  try {
    const {
      issuer,
      subject,
      claimId,
      claim,
      context = "default",
      consent,
    } = req.body;

    if (!issuer || !subject || !claimId || !claim) {
      return res.status(400).json({
        error: "issuer, subject, claimId, and claim are required",
      });
    }

    // 🔐 GDPR: explicit consent required outside default context
    if (context !== "default" && !consent?.purpose) {
      return res.status(400).json({
        error: "Explicit consent with purpose is required for this context",
      });
    }
   

    /*  -----------------------------
       Build VC payload
    ------------------------------ */

    const vc = {
      "@context": ["https://www.w3.org/2018/credentials/v1"],
      type: ["VerifiableCredential"],
      issuer,
      issuanceDate: new Date().toISOString(),
      credentialSubject: {
        id: subject,
        claim,
      },
      pimv: {
        context,
        claimId,
        consent: consent
          ? {
              purpose: consent.purpose,
              grantedAt: new Date().toISOString(),
              expiresAt: consent.expiresAt || null,
            }
          : null,
      },
    };
   /** 
     //This enforces GDPR-compliant explicit disclosure.
    if (!context || context === "default") {
      return res.status(400).json({
      error: "Explicit context required for VC issuance"
    });
    }
    */

    /* -----------------------------
       Sign VC
    ------------------------------ */

    const vcString = JSON.stringify(vc);
    const signature = await signer.signMessage(vcString);

    vc.proof = {
      type: "EcdsaSecp256k1Signature2019",
      created: new Date().toISOString(),
      proofPurpose: "assertionMethod",
      verificationMethod: issuer,
      jws: signature,
    };

    /* -----------------------------
       Upload VC to IPFS
    ------------------------------ */

    const ipfsUri = await uploadJSON(vc);
    const cid = ipfsUri.replace("ipfs://", "");

    /* -----------------------------
       Anchor claim on-chain
    ------------------------------ */

    const claimHash = ethers.keccak256(ethers.toUtf8Bytes(vcString));
    const claimIdBytes32 = ethers.keccak256(
      ethers.toUtf8Bytes(claimId)
    );
    

    const subjectAddress = didToAddress(subject);

    const tx = await registry.setClaim(
      subjectAddress,
      claimIdBytes32,
      claimHash
       );
    await tx.wait();
    /* -----------------------------
       Auto-update Profile (best-effort)
    ------------------------------ */

    try {
      let profile = {};
      const profileCID = await registry.getProfileCID(subjectAddress);

      if (profileCID && profileCID.length > 0) {
        profile = await fetchJSON(profileCID);
      }

      const newCredentialRef = {
        type: "ContextualCredential",
        cid,
        context,
        claimId,
        issuedAt: new Date().toISOString(),
      };

      const updatedProfile = {
        ...profile,
        id: `did:example:${subject}`,
        credentials: [
          ...(profile.credentials || []),
          newCredentialRef,
        ],
        updatedAt: new Date().toISOString(),
      };

      const profileUri = await uploadJSON(updatedProfile);
      const newProfileCid = profileUri.replace("ipfs://", "");

      const tx2 = await registry.setProfileCID(
        subjectAddress,
        newProfileCid
      );
      await tx2.wait();
    } catch (e) {
      console.warn("⚠️ Profile auto-update skipped:", e.message);
    }

    /* -----------------------------
       Response
    ------------------------------*/ 

    return res.json({
      message: "✅ Context-aware VC issued",
      cid,
      context,
      claimId,
      claimHash,
      ipfsUri,
      gatewayUrl: `https://gateway.pinata.cloud/ipfs/${cid}`,
      txHash: tx.hash,
    });
  } catch (err) {
    console.error("❌ issueVC error:", err);
    return res.status(500).json({ error: err.message });
  }
};

/* ------------------------------------------------------------------
   2️⃣ Verify Verifiable Credential
------------------------------------------------------------------- */

export const verifyVC = async (req, res) => {
  try {
    const {
      cid,
      claimId,
      subject,
      verifierDid,
      purpose,
      consent
    } = req.body;

    /* -------------------------------------------------
       1️⃣ Access-level (GDPR disclosure) enforcement
    --------------------------------------------------*/ 

    if (!cid || !claimId || !subject) {
      return res.status(400).json({
        error: "cid, claimId, and subject are required",
      });
    }

    if (!verifierDid) {
      return res.status(403).json({
        error: "Verifier DID required for disclosure",
      });
    }

    if (!purpose) {
      return res.status(403).json({
        error: "Disclosure purpose required",
      });
    }

    if (consent !== true) {
      return res.status(403).json({
        error: "Explicit consent required for disclosure",
      });
    }

    /* -------------------------------------------------
       2️⃣ Fetch VC from IPFS
    --------------------------------------------------*/ 

    const vc = await fetchJSON(cid);

    /* -------------------------------------------------
    🚫 GDPR Art.17 — Right to Erasure enforcement
    --------------------------------------------------*/ 

    if (vc?.credentialSubject?.id === "[ERASED]") {
    return res.status(410).json({
    error: "Credential subject has exercised right to erasure",
    });
    }

    /* -------------------------------------------------
       3️⃣ Credential-level consent enforcement
    --------------------------------------------------*/ 

    const vcContext = vc?.pimv?.context || "default";
    const vcConsent = vc?.pimv?.consent;

    // Default context = public
    if (vcContext !== "default") {
      if (!vcConsent) {
        return res.status(403).json({
          error: "No consent attached to this credential",
        });
      }

      if (vcConsent.purpose !== purpose) {
        return res.status(403).json({
          error: "Purpose not authorized by credential holder",
          allowedPurpose: vcConsent.purpose,
        });
      }

      if (
        vcConsent.expiresAt &&
        new Date(vcConsent.expiresAt) < new Date()
      ) {
        return res.status(403).json({
          error: "Consent has expired",
        });
      }
    }

    /* -------------------------------------------------
       4️⃣ Verify signature
    --------------------------------------------------*/ 

    const vcString = JSON.stringify({
      "@context": vc["@context"],
      type: vc.type,
      issuer: vc.issuer,
      issuanceDate: vc.issuanceDate,
      credentialSubject: vc.credentialSubject,
      pimv: vc.pimv,
    });

    const recovered = ethers.verifyMessage(
      vcString,
      vc.proof.jws
    );

    const validSig =
      recovered.toLowerCase() ===
      vc.proof.verificationMethod.toLowerCase();

    /* -------------------------------------------------
       5️⃣ Verify on-chain anchor
    --------------------------------------------------*/ 

    const claimHash = ethers.keccak256(
      ethers.toUtf8Bytes(vcString)
    );

    const claimIdBytes32 = ethers.keccak256(
      ethers.toUtf8Bytes(claimId)
    );

    const onChainHash = await registry.getClaim(
      subjectAddress,
      claimIdBytes32
    );

    const validOnChain = onChainHash === claimHash;

    if (!validSig || !validOnChain) {
      return res.status(400).json({
        error: "VC verification failed",
        validSig,
        validOnChain,
      });
    }

    /* -------------------------------------------------
       6️⃣ Log disclosure (PostgreSQL)
    --------------------------------------------------*/ 

    await pool.query(
      `
      INSERT INTO disclosures
        (subject_did, verifier_did, claim_id, purpose, consent)
      VALUES ($1, $2, $3, $4, $5)
      `,
      [subject, verifierDid, claimId, purpose, true]
    );

    /* -------------------------------------------------
       7️⃣ Success response
    --------------------------------------------------*/ 

    return res.json({
      message: "✅ VC verified with enforced disclosure",
      subject,
      verifierDid,
      purpose,
      credential: vc,
    });

  } catch (err) {
    console.error("❌ verifyVC error:", err);
    return res.status(500).json({ error: err.message });
  }
};

/* ------------------------------------------------------------------
   3️⃣ Validate Raw Verifiable Credential (Advanced/Debug)
------------------------------------------------------------------- */

export const validateRawVC = async (req, res) => {
  try {
    const vc = req.body;

    if (!vc || typeof vc !== 'object') {
      return res.status(400).json({ error: "Valid VC JSON required in body" });
    }

    // Basic structure check
    if (!vc["@context"] || !vc.type || !vc.issuer || !vc.credentialSubject || !vc.proof) {
      return res.status(400).json({ error: "Invalid VC structure: missing required fields" });
    }

    // Reconstruct signed message (excluding proof)
    const { proof, ...signedPart } = vc;
    const vcString = JSON.stringify(signedPart);

    // Verify signature
    const recovered = ethers.verifyMessage(vcString, proof.jws);
    // Extract address from DID if needed
    const issuerAddress = didToAddress(vc.issuer);  // Use your existing helper!
    const validSig = recovered.toLowerCase() === issuerAddress.toLowerCase();

    if (!validSig) {
      return res.status(400).json({
        error: "Invalid signature",
        recoveredAddress: recovered,
        expectedIssuerAddress: issuerAddress,
        expectedIssuer: vc.issuer
      });
    }

    // Compute claim hash and check on-chain
    const claimHash = ethers.keccak256(ethers.toUtf8Bytes(vcString));
    const subjectAddress = didToAddress(vc.credentialSubject.id);

    // Try to infer claimId from pimv or fallback
   // const inferredClaimId = vc.pimv?.claimId || "unknown";
    // Try to get claimId from the credential if stored (you can add it to pimv on issuance)
    const claimId = vc.pimv?.claimId; // fallback to common default
    if (!claimId) {
      return res.status(400).json({ error: "VC missing pimv.claimId — cannot validate on-chain anchor" });
  }

    const claimIdBytes32 = ethers.keccak256(ethers.toUtf8Bytes(claimId));
    const onChainHash = await registry.getClaim(subjectAddress, claimIdBytes32);

    const validOnChain = onChainHash === claimHash;

    if (!validOnChain) {
      return res.status(400).json({
        error: "On-chain anchor mismatch",
        expectedHash: claimHash,
        onChainHash
      });
    }

    // All good!
    return res.json({
      message: "✅ Verifiable Credential is valid",
      validSignature: true,
      validOnChain: true,
      issuer: vc.issuer,
      subject: vc.credentialSubject.id,
      context: vc.pimv?.context || "default",
      issuedAt: vc.issuanceDate
    });

  } catch (err) {
    console.error("❌ validateRawVC error:", err);
    return res.status(500).json({ error: err.message });
  }
};