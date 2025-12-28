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
      context = "default"
    } = req.body;

    if (!issuer || !subject || !claimId || !claim) {
      return res.status(400).json({
        error: "issuer, subject, claimId, and claim are required",
      });
    }

    /* -------------------------------------------------
       Build VC payload (NO consent here)
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
        claimId
      }
    };

    /* -------------------------------------------------
       Sign VC
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
       Upload VC to IPFS
    --------------------------------------------------*/
    const ipfsUri = await uploadJSON(vc);
    const cid = ipfsUri.replace("ipfs://", "");

    /* -------------------------------------------------
       Anchor VC hash on-chain (ONLY place this happens)
    --------------------------------------------------*/
    const claimHash = ethers.keccak256(ethers.toUtf8Bytes(cid));
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

    /* -------------------------------------------------
       Auto-update Profile (best effort)
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
            cid,
            context,
            claimId,
            issuedAt: new Date().toISOString()
          }
        ],
        updatedAt: new Date().toISOString()
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

    /* -------------------------------------------------
       Response
    --------------------------------------------------*/
    return res.json({
      message: "✅ VC issued and anchored",
      cid,
      claimId,
      context,
      claimHash,
      txHash: tx.hash,
      gatewayUrl: `https://gateway.pinata.cloud/ipfs/${cid}`
    });

  } catch (err) {
    console.error("❌ issueVC error:", err);
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
         5️⃣ Enforce consent + purpose (DB = source of truth)
      --------------------------------------------------*/
      const consentRes = await pool.query(
        `
        SELECT 1
        FROM consents
        WHERE subject_did = $1
          AND claim_id = $2
          AND purpose = $3
          AND revoked_at IS NULL
          AND (expires_at IS NULL OR expires_at > NOW())
        LIMIT 1
        `,
        [subjectAddress, claimId, purpose]
      );

      if (consentRes.rowCount === 0) {
        denied[claimId] = "No valid consent for this purpose";
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
          (subject_did, verifier_did, claim_id, purpose, consent)
        VALUES ($1, $2, $3, $4, $5)
        `,
        [subjectAddress, verifierDid, claimId, purpose, true]
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

    /* 1️⃣ Verify signature */
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
        expected: issuerAddress
      });
    }

    /* 2️⃣ Verify on-chain anchor */
    const claimId = vc.pimv?.claimId;
    if (!claimId) {
      return res.status(400).json({
        error: "VC missing pimv.claimId"
      });
    }

    if (!vc.cid && !vc.pimv?.cid) {
      return res.status(400).json({
        error: "CID required for on-chain validation"
      });
    }

    const cid = vc.cid || vc.pimv.cid;
    const subjectAddress = didToAddress(vc.credentialSubject.id);

    const claimHash = ethers.keccak256(
      ethers.toUtf8Bytes(cid)
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
        onChain: onChainHash
      });
    }

    return res.json({
      message: "✅ VC is cryptographically and on-chain valid",
      issuer: vc.issuer,
      subject: vc.credentialSubject.id,
      claimId,
      context: vc.pimv?.context || "default",
      issuedAt: vc.issuanceDate
    });

  } catch (err) {
    console.error("❌ validateRawVC error:", err);
    return res.status(500).json({ error: err.message });
  }
};
