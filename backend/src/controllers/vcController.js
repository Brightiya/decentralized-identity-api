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
