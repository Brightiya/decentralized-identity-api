// backend/src/controllers/vcController.js
import { ethers } from "ethers";
import { uploadJSON, fetchJSON } from "../utils/pinata.js";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import { pool } from "../utils/db.js";
import { isHybridMode, prepareUnsignedTx } from "../utils/contract.js";

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
  
  let addr = didOrAddress;
  
  // Strip any did: prefix
  if (addr.startsWith('did:')) {
    addr = addr.split(':').pop();
  }
  
  // Force lowercase + ensure 0x prefix
  if (addr.startsWith('0x')) {
    addr = addr.slice(2);
  }
  
  addr = addr.toLowerCase();
  
  // Basic validation (optional but good)
  if (!/^[0-9a-f]{40}$/.test(addr)) {
    console.warn('Invalid address format:', didOrAddress);
  }
  
  return '0x' + addr;
};

/* ------------------------------------------------------------------
   Helper: Get Pinata JWT for this request (user > shared)
------------------------------------------------------------------- */
function getPinataJwtForRequest(req) {
  const userJwt = req.headers['x-pinata-user-jwt'];
  if (userJwt) {
    return userJwt;
  }

  // Fallback to shared key
  if (process.env.NODE_ENV !== 'development') {
    console.warn('[SECURITY] Using shared Pinata JWT in production mode - recommend per-user keys');
  }
  return process.env.PINATA_JWT;
}

/* ------------------------------------------------------------------
   1️⃣ Issue Context-Aware Verifiable Credential
------------------------------------------------------------------- */
export const issueVC = async (req, res) => {
  try {
    let {
      issuer,
      subject,
      claimId,
      claim,
      context = "default",  // ← will be normalized below
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

    // ────────────────────────────────
    // Normalize context (simple lowercase trim)
    // ────────────────────────────────
    const normalizeContext = (ctx) => {
      if (!ctx) return 'profile';
      return ctx.trim().toLowerCase();
    };

    context = normalizeContext(context);

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
        context,        // ← normalized & passthrough compatible
        claimId,
        purpose: consent.purpose,
        consentRequired: true
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

    // Get both keys from headers
    const pinataJwt = getPinataJwtForRequest(req);
    const nftStorageKey = req.headers['x-nft-storage-key'] || null;

    /* -------------------------------------------------
       Upload signed VC to IPFS (nft.storage preferred)
    --------------------------------------------------*/
    const ipfsUri = await uploadJSON(vc, pinataJwt, nftStorageKey);
    const cid = ipfsUri.replace("ipfs://", "");

    /* -------------------------------------------------
       Enriched version (adds CID, not signed)
    --------------------------------------------------*/
    const enrichedVC = {
      ...vc,
      pimv: {
        ...vc.pimv,
        cid
      }
    };

    const enrichedIpfsUri = await uploadJSON(enrichedVC, pinataJwt, nftStorageKey);
    const enrichedCid = enrichedIpfsUri.replace("ipfs://", "");

    /* -------------------------------------------------
       Prepare anchoring on-chain (hybrid or dev)
    --------------------------------------------------*/
    const claimHash = ethers.keccak256(ethers.toUtf8Bytes(cid));
    const claimIdBytes32 = ethers.keccak256(ethers.toUtf8Bytes(claimId));
    const subjectAddress = didToAddress(subject);

    let responseData = {
      message: "✅ VC issued and anchored on IPFS",
      cid: enrichedCid,
      signedCid: cid,
      claimId,
      context,
      claimHash,
      gatewayUrl: `https://gateway.pinata.cloud/ipfs/${enrichedCid}`
    };

    if (isHybridMode()) {
      // Hybrid mode: Prepare unsigned tx for frontend
      const unsignedTx = await prepareUnsignedTx(
        'setClaim',
        subjectAddress,
        claimIdBytes32,
        claimHash
      );
      responseData = {
        ...responseData,
        message: "✅ VC prepared - please sign & send transaction in your wallet",
        unsignedTx
      };
      console.log('[Hybrid] Prepared unsigned setClaim tx');
    } else {
      // Dev mode: Backend signs and submits
      const tx = await registry.setClaim(
        subjectAddress,
        claimIdBytes32,
        claimHash
      );
      await tx.wait();
      responseData.txHash = tx.hash;
      responseData.message = "✅ VC issued and anchored on-chain (backend signed)";
      console.log('[Dev] Backend signed & submitted setClaim tx');
    }

    /* -------------------------------------------------
       Auto-update profile (optional) - also hybrid
    --------------------------------------------------*/
    try {
      let profile = {};
      const profileCID = await registry.getProfileCID(subjectAddress);

      if (profileCID && profileCID.length > 0) {
        const preferred = req.headers['x-preferred-gateway'] || null;
        profile = await fetchJSON(profileCID, 3, preferred);
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

      const profileUri = await uploadJSON(updatedProfile, pinataJwt, nftStorageKey);
      const newProfileCid = profileUri.replace("ipfs://", "");

      if (isHybridMode()) {
        // Prepare unsigned tx for profile update
        const profileUnsignedTx = await prepareUnsignedTx(
          'setProfileCID',
          subjectAddress,
          newProfileCid
        );
        responseData.profileUnsignedTx = profileUnsignedTx;
        responseData.message += " + profile update prepared (sign both txs)";
        console.log('[Hybrid] Prepared unsigned setProfileCID (profile update) tx');
      } else {
        // Dev mode: backend signs profile update
        const tx = await registry.setProfileCID(subjectAddress, newProfileCid);
        await tx.wait();
        console.log('[Dev] Backend signed & submitted setProfileCID (profile update) tx');
      }
    } catch (e) {
      console.warn("Profile auto-update skipped:", e.message);
    }

    return res.json(responseData);

  } catch (err) {
    console.error("issueVC error:", err);
    return res.status(500).json({ error: err.message });
  }
};

/* ------------------------------------------------------------------
   2️⃣ Verify Verifiable Credentials (unchanged - read only)
------------------------------------------------------------------- */
export const verifyVC = async (req, res) => {
  try {
    const {
      subject,
      verifierDid,
      purpose,
      context,
      consent,
      credentials
    } = req.body;

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
        error:
          "subject, verifierDid, purpose, consent=true, credentials[] required",
      });
    }

    const disclosed = {};
    const denied = {};
    const subjectAddress = didToAddress(subject);
    const verifierAddress = didToAddress(verifierDid);

    for (const entry of credentials) {
      const { cid, claimId } = entry;

      if (!cid || !claimId) {
        denied[claimId || cid] = "Invalid credential entry";
        continue;
      }

      const preferred = req.headers['x-preferred-gateway'] || null;
      const vc = await fetchJSON(cid, 3, preferred);

      if (vc?.credentialSubject?.id === "[ERASED]") {
        denied[claimId] = "Credential subject erased";
        continue;
      }

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

      const vcContext = vc?.pimv?.context;

      if (!vcContext || typeof vcContext !== "string") {
        denied[claimId] = "VC missing disclosure context";
        continue;
      }

      if (vcContext.toLowerCase() !== context.toLowerCase()) {
        denied[claimId] = `VC context mismatch: VC has "${vcContext}", but requested "${context}"`;
        continue;
      }

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
        [subjectAddress, claimId, purpose, vcContext, context]
      );

      if (consentRes.rowCount === 0) {
        denied[claimId] = "No valid consent for this purpose and context";
        continue;
      }

      const field = claimId.split(".").pop();
      const value = vc?.credentialSubject?.claim?.[field];

      if (value === undefined) {
        denied[claimId] = "Claim not present in credential";
        continue;
      }

      disclosed[claimId] = value;

      await pool.query(
        ` 
        INSERT INTO disclosures
          (subject_did, verifier_did, claim_id, purpose, context, consent, disclosed_at)
        VALUES ($1, $2, $3, $4, $5, $6, NOW())
        `,
        [subjectAddress, verifierAddress, claimId, purpose, vcContext, context, true]
      );
    }

    if (Object.keys(disclosed).length === 0) {
      return res.status(403).json({
        error: "No credentials authorized for disclosure",
        denied,
      });
    }

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
    return res.status(500).json({ error: err.message });
  }
};

/* ------------------------------------------------------------------
   3️⃣ Validate Raw VC (unchanged - read only)
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

    let cidForValidation = null;

    if (vc.pimv?.cid) {
      cidForValidation = vc.pimv.cid;
      delete vc.pimv.cid;
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