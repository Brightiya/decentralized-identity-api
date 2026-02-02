// backend/src/controllers/didController.js
import { ethers } from "ethers";
import { uploadJSON, fetchJSON } from "../utils/pinata.js";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { requireDidAddress as normalizeAddress } from "../utils/did.js";


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

    const normalizedAddress = normalizeAddress(address);
    const did = `did:ethr:${normalizedAddress}`;
    const controllerAddress = signer.address;
    const verificationMethodId = `${did}#controller`;

    // Optional: Basic validation for name/email
    if (name && name.length > 100) {
      return res.status(400).json({ error: "Name too long (max 100 characters)" });
    }
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: "Invalid email format" });
    }

    // Build W3C + EIP-155 DID Document
    const didDocument = {
      "@context": [
        "https://www.w3.org/ns/did/v1",
        "https://w3id.org/security/suites/secp256k1-2019/v1"
      ],
      id: did,
      controller: did,
      alsoKnownAs: email ? [`mailto:${email}`] : [],
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
          blockchainAccountId: `eip155:1:${normalizedAddress}`
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
      metadata: { name: name || undefined, email: email || undefined },
    };

    // Upload to IPFS
    const ipfsUri = await uploadJSON(didDocument);
    const cid = ipfsUri.replace("ipfs://", "");

    // Store CID on-chain
    const tx = await globalThis.registry.setProfileCID(normalizedAddress, cid);
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
    return res.status(500).json({ error: "Failed to register DID" });
  }
};

/**
 * Resolve DID Document from chain + IPFS
 * GET /api/did/:address
 */
export const resolveDID = async (req, res) => {
  try {
    let { address } = req.params;
    if (!address || !ethers.isAddress(address)) {
      return res.status(400).json({ error: "Valid Ethereum address required" });
    }

    address = normalizeAddress(address);

    const cid = await globalThis.registry.getProfileCID(address);
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
    return res.status(500).json({ error: "Failed to resolve DID" });
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

    const normalizedAddress = normalizeAddress(address);

    // Step 1: Resolve the DID
    const cid = await globalThis.registry.getProfileCID(normalizedAddress);
    if (!cid || cid === "0x" || cid.length === 0) {
      return res.status(404).json({ error: "DID Document not found" });
    }
    const didDocument = await fetchJSON(cid);
    const did = `did:ethr:${normalizedAddress}`;

    // Step 2: Reconstruct message
    const message = `Verifying DID ownership for ${did}`;
    const recovered = ethers.verifyMessage(message, signature);

    // Step 3: Check that recovered address matches DID address
    const valid = recovered.toLowerCase() === normalizedAddress;

    return res.json({
      message: valid ? "✅ DID verification successful" : "❌ DID verification failed",
      valid,
      did,
      recoveredAddress: recovered,
      expectedAddress: normalizedAddress,
      didDocument,
    });
  } catch (err) {
    if (err.code === "INVALID_ARGUMENT") {
      return res.status(400).json({ error: "Invalid signature format" });
}
  }
};