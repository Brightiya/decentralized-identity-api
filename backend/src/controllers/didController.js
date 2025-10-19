// backend/src/controllers/didController.js
import { ethers } from "ethers";
import { uploadJSON, fetchJSON } from "../utils/pinata.js";
import dotenv from "dotenv";

dotenv.config();

const provider = new ethers.JsonRpcProvider(process.env.PROVIDER_URL);
const signer = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

// Dynamically import contractData.json
const contractData = await import("../../src/contractData.json", {
  assert: { type: "json" },
}).then((module) => module.default);
const registry = new ethers.Contract(contractData.address, contractData.abi, signer);

/**
 * Register a DID (W3C DID Core + EIP-155 compliant)
 * POST /api/did/register
 */
export const registerDID = async (req, res) => {
  try {
    const { address, name, email } = req.body;
    if (!address || !ethers.isAddress(address)) {
      return res.status(400).json({ error: "Valid Ethereum address required" });
    }

    const did = `did:ethr:${address}`;
    const controllerAddress = signer.address;
    const verificationMethodId = `${did}#controller`;

    // Build W3C + EIP-155 DID Document
    const didDocument = {
      "@context": [
        "https://www.w3.org/ns/did/v1",
        "https://w3id.org/security/suites/secp256k1-2019/v1"
      ],
      id: did,
      controller: did,
      alsoKnownAs: [email ? `mailto:${email}` : null].filter(Boolean),
      verificationMethod: [
        {
          id: verificationMethodId,
          type: "EcdsaSecp256k1VerificationKey2019",
          controller: did,
          publicKeyHex: controllerAddress,
        },
        {
          id: `${did}#ethereumAddress`,
          type: "EcdsaSecp256k1RecoveryMethod2020",
          controller: did,
          blockchainAccountId: `eip155:1:${address}`
        }
      ],
      authentication: [verificationMethodId, `${did}#ethereumAddress`],
      assertionMethod: [verificationMethodId, `${did}#ethereumAddress`],
      service: [
        {
          id: `${did}#profile`,
          type: "LinkedDomains",
          serviceEndpoint: "https://gateway.pinata.cloud/ipfs/"
        }
      ],
      created: new Date().toISOString(),
      updated: new Date().toISOString(),
      metadata: { name, email },
    };

    // Upload to IPFS
    const ipfsUri = await uploadJSON(didDocument);
    const cid = ipfsUri.replace("ipfs://", "");

    // Store CID on-chain
    const tx = await registry.setProfileCID(address, cid);
    await tx.wait();

    return res.json({
      message: "✅ W3C DID registered successfully (EIP-155 compatible)",
      did,
      cid,
      ipfsUri,
      gatewayUrl: `https://gateway.pinata.cloud/ipfs/${cid}`,
      txHash: tx.hash,
    });
  } catch (err) {
    console.error("❌ registerDID error:", err);
    return res.status(500).json({ error: err.message });
  }
};

/**
 * Resolve DID Document from chain + IPFS
 * GET /api/did/:address
 */
export const resolveDID = async (req, res) => {
  try {
    const { address } = req.params;
    if (!address || !ethers.isAddress(address)) {
      return res.status(400).json({ error: "Valid Ethereum address required" });
    }

    const cid = await registry.getProfileCID(address);
    if (!cid || cid === "0x" || cid.length === 0) {
      return res.status(404).json({ error: "DID Document not found" });
    }

    const didDocument = await fetchJSON(cid);
    return res.json({
      message: "✅ DID Document resolved successfully",
      didDocument,
      cid,
      gatewayUrl: `https://gateway.pinata.cloud/ipfs/${cid}`,
    });
  } catch (err) {
    if (err.code === "BAD_DATA") {
      return res.status(404).json({ error: "DID Document not found or data unavailable" });
    }
    console.error("❌ resolveDID error:", err);
    return res.status(500).json({ error: err.message });
  }
};

/**
 * Verify DID ownership using EIP-191 signature
 * POST /api/did/verify
 * body: { address, signature }
 */
export const verifyDID = async (req, res) => {
  try {
    const { address, signature } = req.body;
    if (!address || !ethers.isAddress(address) || !signature) {
      return res.status(400).json({ error: "address and signature are required" });
    }

    // Step 1: Resolve the DID
    const cid = await registry.getProfileCID(address);
    if (!cid || cid === "0x" || cid.length === 0) {
      return res.status(404).json({ error: "DID Document not found" });
    }
    const didDocument = await fetchJSON(cid);
    const did = `did:ethr:${address}`;

    // Step 2: Reconstruct message
    const message = `Verifying DID ownership for ${did}`;
    const recovered = ethers.verifyMessage(message, signature);

    // Step 3: Check that recovered address matches DID address
    const valid = recovered.toLowerCase() === address.toLowerCase();

    return res.json({
      message: valid ? "✅ DID verification successful" : "❌ DID verification failed",
      valid,
      did,
      recoveredAddress: recovered,
      expectedAddress: address,
      didDocument,
    });
  } catch (err) {
    console.error("❌ verifyDID error:", err);
    return res.status(500).json({ error: err.message });
  }
};