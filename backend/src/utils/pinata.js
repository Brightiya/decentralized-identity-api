// backend/src/utils/pinata.js
import PinataSDK from "@pinata/sdk";
import dotenv from "dotenv";
import axios from "axios";

dotenv.config();

const PINATA_JWT = process.env.PINATA_JWT;

/**
 * Ordered gateways — public/trustless first, then Pinata (last resort)
 * Public gateways can read content from ANY Pinata account (as long as it's public)
 */
const IPFS_GATEWAYS = [
  "https://ipfs.io/ipfs/",           // Official, trustless
  "https://dweb.link/ipfs/",         // IPFS Foundation, reliable
  "https://gateway.ipfs.io/ipfs/",    // Cloudflare mirror
  "https://ipfs.ethere.link/ipfs/",   // Ethereum-based
  "https://gateway.pinata.cloud/ipfs/", // Your own (fast for shared key content)
  process.env.PINATA_GATEWAY || "https://gateway.pinata.cloud/ipfs/" // fallback/custom
].filter(Boolean); // remove undefined/empty

if (!PINATA_JWT) {
  console.warn("⚠️ Missing PINATA_JWT in .env. Shared uploads/unpins will fail.");
}

const pinata = new PinataSDK({ pinataJWTKey: PINATA_JWT });

/**
 * Upload JSON to IPFS via Pinata
 * @param {Object} json - The JSON object to upload
 * @param {string} [jwt] - Optional user-provided JWT (preferred)
 * @returns {Promise<string>} ipfs:// URI
 */
export async function uploadJSON(json, jwt = null) {
  const effectiveJwt = jwt || PINATA_JWT;

  if (!effectiveJwt) {
    throw new Error("No Pinata JWT available (user nor env)");
  }

  // Security warning when falling back to shared key in production
  if (!jwt && process.env.NODE_ENV !== "development") {
    console.warn(
      "[SECURITY] Using shared Pinata JWT in production - strongly recommend per-user keys"
    );
  }
  try {
    const result = await pinata.pinJSONToIPFS(json, {
      pinataJWTKey: effectiveJwt // override SDK's default key
    });
    return `ipfs://${result.IpfsHash}`;
  } catch (err) {
    throw new Error(`Pinata upload failed: ${err.message}`);
  }
}

/**
 * Fetch JSON from IPFS with gateway rotation + retries
 * Updated: public gateways first to support cross-account reads
 */
export async function fetchJSON(cidOrUrl, retries = 3) {
  const cid = cidOrUrl.startsWith("ipfs://")
    ? cidOrUrl.replace("ipfs://", "")
    : cidOrUrl;

  let lastError = null;

  for (const gateway of IPFS_GATEWAYS) {
    const url = cid.startsWith("http") ? cid : `${gateway}${cid}`;

    console.log(`[fetchJSON] Trying gateway: ${gateway}`); // ← helpful debug

    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const res = await axios.get(url, {
          timeout: 30000,
        });
        console.log(`[fetchJSON] Success from ${gateway}`);
        return res.data;
      } catch (err) {
        lastError = err;
        console.warn(`[fetchJSON] Attempt ${attempt} failed on ${gateway}: ${err.message}`);
        // ⏳ exponential backoff
        await new Promise(r => setTimeout(r, attempt * 500));
      }
    }
  }

  throw new Error(
    `Failed to fetch JSON from IPFS after all gateways/retries: ${lastError?.message || 'Unknown error'}`
  );
}

/**
 * GDPR-compliant unpin (Right to Erasure)
 * @param {string} cidOrUri - CID or ipfs:// URI
 * @param {string} [jwt] - Optional user-provided JWT (preferred)
 */
export async function unpinCID(cidOrUri, jwt = null) {
  const effectiveJwt = jwt || PINATA_JWT;

  if (!effectiveJwt) {
    throw new Error("No Pinata JWT available for unpin (user nor env)");
  }

  const cid = cidOrUri.startsWith("ipfs://")
    ? cidOrUri.replace("ipfs://", "")
    : cidOrUri;

  try {
    await axios.delete(
      `https://api.pinata.cloud/pinning/unpin/${cid}`,
      {
        headers: {
          Authorization: `Bearer ${effectiveJwt}`,
        },
      }
    );
  } catch (err) {
    throw new Error(`Pinata unpin failed for ${cid}: ${err.message}`);
  }
}
