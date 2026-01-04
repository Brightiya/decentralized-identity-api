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
      consent
    } = req.body;

    if (!issuer || !subject || !claimId || !claim) {
      return res.status(400).json({
        error: "issuer, subject, claimId, and claim are required",
      });
    }
    if (!consent || !consent.purpose || !consent.purpose.trim()) {
      return res.status(400).json({
        error: "Explicit consent purpose is required for VC issuance"
      });
    }

    /* -------------------------------------------------
       Build VC payload — FINAL version (no cid yet)
    --------------------------------------------------*/
    const vc = {
      "@context": ["https://www.w3.org/2018/credentials/v1"],
      type: ["VerifiableCredential"],
      issuer,
      issuanceDate: new Date().toISOString(),
      credentialSubject: {
        id: subject,
        claim
      },
      pimv: {
        context,
        claimId,
        purpose: consent.purpose,
        consentRequired: true
        // We will NOT put cid here in the signed part
      }
    };

    /* -------------------------------------------------
       Sign the clean VC
    --------------------------------------------------*/
    const vcString = JSON.stringify(vc);
    const signature = await signer.signMessage(vcString);

    vc.proof = {
      type: "EcdsaSecp256k1Signature2019",
      created: new Date().toISOString(),
      proofPurpose: "assertionMethod",
      verificationMethod: issuer,
      jws: signature
    };

    /* -------------------------------------------------
       Upload the FINAL signed VC to IPFS
    --------------------------------------------------*/
    const ipfsUri = await uploadJSON(vc);
    const cid = ipfsUri.replace("ipfs://", "");

    /* -------------------------------------------------
       Create enriched version for gateway (includes cid) — NOT signed
    --------------------------------------------------*/
    const enrichedVC = {
      ...vc,
      pimv: {
        ...vc.pimv,
        cid  // ← Add CID here, but this version is NOT signed
      }
    };

    // Upload enriched version (this is what users see via gatewayUrl)
    const enrichedIpfsUri = await uploadJSON(enrichedVC);
    const enrichedCid = enrichedIpfsUri.replace("ipfs://", "");

    /* -------------------------------------------------
       Anchor the SIGNED (clean) VC's CID on-chain
    --------------------------------------------------*/
    const claimHash = ethers.keccak256(ethers.toUtf8Bytes(cid)); // ← anchor the signed one
    const claimIdBytes32 = ethers.keccak256(ethers.toUtf8Bytes(claimId));
    const subjectAddress = didToAddress(subject);

    const tx = await registry.setClaim(
      subjectAddress,
      claimIdBytes32,
      claimHash
    );
    await tx.wait();

    /* -------------------------------------------------
       Auto-update Profile — use signed CID
    --------------------------------------------------*/
    try {
      let profile = {};
      const profileCID = await registry.getProfileCID(subjectAddress);

      if (profileCID && profileCID.length > 0) {
        profile = await fetchJSON(profileCID);
      }

      const updatedProfile = {
        ...profile,
        credentials: [
          ...(profile.credentials || []),
          {
            type: "ContextualCredential",
            cid,  // signed version
            context,
            claimId,
            issuedAt: new Date().toISOString()
          }
        ],
        updatedAt: new Date().toISOString()
      };

      const profileUri = await uploadJSON(updatedProfile);
      const newProfileCid = profileUri.replace("ipfs://", "");

      await registry.setProfileCID(subjectAddress, newProfileCid).then(tx => tx.wait());
    } catch (e) {
      console.warn("Profile auto-update skipped:", e.message);
    }

    /* -------------------------------------------------
       Response — point to enriched gateway URL
    --------------------------------------------------*/
    return res.json({
      message: " ✅ VC issued and anchored",
      cid: enrichedCid,  // enriched one for user
      signedCid: cid,    // for debugging
      claimId,
      context,
      claimHash,
      txHash: tx.hash,
      gatewayUrl: `https://gateway.pinata.cloud/ipfs/${enrichedCid}`
    });

  } catch (err) {
    console.error("issueVC error:", err);
    return res.status(500).json({ error: err.message });
  }
};

/* ------------------------------------------------------------------
   2️⃣ Verify Verifiable Credentials (multi-CID, one-claim-per-VC)
------------------------------------------------------------------- */
export const verifyVC = async (req, res) => {
  try {
    const {
      subject,
      verifierDid,
      purpose,
      consent,
      credentials
    } = req.body;

    /* -------------------------------------------------
       1️⃣ Basic request validation
    --------------------------------------------------*/
    if (
      !subject ||
      !verifierDid ||
      !purpose ||
      consent !== true ||
      !Array.isArray(credentials) ||
      credentials.length === 0
    ) {
      return res.status(400).json({
        error:
          "subject, verifierDid, purpose, consent=true, credentials[] required",
      });
    }

    const disclosed = {};
    const denied = {};
    const subjectAddress = didToAddress(subject);

    /* -------------------------------------------------
       2️⃣ Process each VC independently
    --------------------------------------------------*/
    for (const entry of credentials) {
      const { cid, claimId } = entry;

      if (!cid || !claimId) {
        denied[claimId || cid] = "Invalid credential entry";
        continue;
      }

      /* -------------------------------------------------
         3️⃣ Fetch VC from IPFS
      --------------------------------------------------*/
      const vc = await fetchJSON(cid);

      /* -------------------------------------------------
         🚫 GDPR Art.17 — Right to Erasure
      --------------------------------------------------*/
      if (vc?.credentialSubject?.id === "[ERASED]") {
        denied[claimId] = "Credential subject erased";
        continue;
      }

      /* -------------------------------------------------
         4️⃣ Verify VC signature
      --------------------------------------------------*/
      const { proof, ...signedVC } = vc;

      if (!proof?.jws) {
        denied[claimId] = "Missing VC proof";
        continue;
      }

      const vcString = JSON.stringify(signedVC);
      const recovered = ethers.verifyMessage(vcString, proof.jws);
      const issuerAddress = didToAddress(vc.issuer);

      if (recovered.toLowerCase() !== issuerAddress.toLowerCase()) {
        denied[claimId] = "Invalid VC signature";
        continue;
      }

      /* -------------------------------------------------
         🔎 Extract VC context (MANDATORY)
      --------------------------------------------------*/
      const vcContext = vc?.pimv?.context;

      if (!vcContext || typeof vcContext !== "string") {
        denied[claimId] = "VC missing disclosure context";
        continue;
      }

      /* -------------------------------------------------
         5️⃣ Enforce consent + purpose + context
         (DB = source of truth)
      --------------------------------------------------*/
      const consentRes = await pool.query(
        `
        SELECT 1
        FROM consents
        WHERE subject_did = $1
          AND claim_id = $2
          AND purpose = $3
          AND context = $4
          AND revoked_at IS NULL
          AND (expires_at IS NULL OR expires_at > NOW())
        LIMIT 1
        `,
        [subjectAddress, claimId, purpose, vcContext]
      );

      if (consentRes.rowCount === 0) {
        denied[claimId] = "No valid consent for this purpose and context";
        continue;
      }

      /* -------------------------------------------------
         6️⃣ Data minimization (single claim only)
      --------------------------------------------------*/
      const field = claimId.split(".").pop();
      const value = vc?.credentialSubject?.claim?.[field];

      if (value === undefined) {
        denied[claimId] = "Claim not present in credential";
        continue;
      }

      disclosed[claimId] = value;

      /* -------------------------------------------------
         7️⃣ Log disclosure (audit trail)
      --------------------------------------------------*/
      await pool.query(
        `
        INSERT INTO disclosures
          (subject_did, verifier_did, claim_id, purpose, context, consent)
        VALUES ($1, $2, $3, $4, $5, $6)
        `,
        [subjectAddress, verifierDid, claimId, purpose, vcContext, true]
      );
    }

    /* -------------------------------------------------
       8️⃣ Enforce data minimization
    --------------------------------------------------*/
    if (Object.keys(disclosed).length === 0) {
      return res.status(403).json({
        error: "No credentials authorized for disclosure",
        denied,
      });
    }

    /* -------------------------------------------------
       9️⃣ Success
    --------------------------------------------------*/
    return res.json({
      message: "✅ Credentials verified with enforced disclosure",
      subject: subjectAddress,
      verifierDid,
      purpose,
      disclosed,
      denied,
    });

  } catch (err) {
    console.error("❌ verifyVC error:", err);
    return res.status(500).json({ error: err.message });
  }
};


/* ------------------------------------------------------------------
   3️⃣ Validate Raw Verifiable Credential (Debug / Audit)
------------------------------------------------------------------- */

export const validateRawVC = async (req, res) => {
  try {
    const vc = req.body;

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
        error: "Invalid VC structure"
      });
    }

    /* 1️⃣ Verify signature — handle case where pimv.cid is present */
    let cidForValidation = null;

    // Extract and temporarily remove cid if present (in pimv or root)
    if (vc.pimv?.cid) {
      cidForValidation = vc.pimv.cid;
      delete vc.pimv.cid;  // Remove so signature matches original signed payload
    } else if (vc.cid) {
      cidForValidation = vc.cid;
      delete vc.cid;
    }

    const { proof, ...unsignedVC } = vc;

    const recovered = ethers.verifyMessage(
      JSON.stringify(unsignedVC),
      proof.jws
    );

    const issuerAddress = didToAddress(vc.issuer);
    if (recovered.toLowerCase() !== issuerAddress.toLowerCase()) {
      return res.status(400).json({
        error: "Invalid signature",
        recovered,
        expected: issuerAddress,
        note: "Signature mismatch likely due to extra fields (e.g. cid) added after signing"
      });
    }

    /* 2️⃣ Verify on-chain anchor */
    const claimId = vc.pimv?.claimId;
    if (!claimId) {
      return res.status(400).json({
        error: "VC missing pimv.claimId"
      });
    }

    if (!cidForValidation) {
      return res.status(400).json({
        error: "CID required for on-chain validation (not found in vc.cid or vc.pimv.cid)"
      });
    }

    const subjectAddress = didToAddress(vc.credentialSubject.id);

    const claimHash = ethers.keccak256(
      ethers.toUtf8Bytes(cidForValidation)
    );
    const claimIdBytes32 = ethers.keccak256(
      ethers.toUtf8Bytes(claimId)
    );

    const onChainHash = await registry.getClaim(
      subjectAddress,
      claimIdBytes32
    );

    if (onChainHash !== claimHash) {
      return res.status(400).json({
        error: "On-chain anchor mismatch",
        expected: claimHash,
        onChain: onChainHash,
        cidUsed: cidForValidation
      });
    }

    /* Success */
    return res.json({
      message: "✅ VC is cryptographically and on-chain valid",
      issuer: vc.issuer,
      subject: vc.credentialSubject.id,
      claimId,
      context: vc.pimv?.context || "default",
      purpose: vc.pimv?.purpose,
      cid: cidForValidation,
      issuedAt: vc.issuanceDate
    });

  } catch (err) {
    console.error("validateRawVC error:", err);
    return res.status(500).json({ error: err.message });
  }
};
