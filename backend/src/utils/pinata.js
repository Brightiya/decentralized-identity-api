// backend/src/utils/pinata.js
import PinataSDK from "@pinata/sdk";
import dotenv from "dotenv";
import axios from "axios";

dotenv.config();

const PINATA_JWT = process.env.PINATA_JWT;

/**
 * Multiple IPFS gateways (fallback + load balancing)
 */
const IPFS_GATEWAYS = [
  process.env.PINATA_GATEWAY
];

if (!PINATA_JWT) {
  console.warn("⚠️ Missing PINATA_JWT. Pinata uploads/unpins will fail.");
}

const pinata = new PinataSDK({ pinataJWTKey: PINATA_JWT });

/**
 * Upload JSON to IPFS via Pinata
 */
export async function uploadJSON(json) {
  try {
    const result = await pinata.pinJSONToIPFS(json);
    return `ipfs://${result.IpfsHash}`;
  } catch (err) {
    throw new Error(`Pinata upload failed: ${err.message}`);
  }
}

/**
 * Fetch JSON from IPFS with:
 * - gateway rotation
 * - retries
 * - timeout protection
 */
export async function fetchJSON(cidOrUrl, retries = 3) {
  const cid = cidOrUrl.startsWith("ipfs://")
    ? cidOrUrl.replace("ipfs://", "")
    : cidOrUrl;

  let lastError = null;

  for (const gateway of IPFS_GATEWAYS) {
    const url = cid.startsWith("http") ? cid : `${gateway}${cid}`;

    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const res = await axios.get(url, {
          timeout: 30000,
        });
        return res.data;
      } catch (err) {
        lastError = err;

        // ⏳ exponential backoff
        await new Promise(r => setTimeout(r, attempt * 500));
      }
    }
  }

  throw new Error(
    `Failed to fetch JSON from IPFS after retries: ${lastError?.message}`
  );
}

/**
 * GDPR-compliant unpin (Right to Erasure)
 */
export async function unpinCID(cidOrUri) {
  if (!PINATA_JWT) {
    throw new Error("PINATA_JWT not configured");
  }

  const cid = cidOrUri.startsWith("ipfs://")
    ? cidOrUri.replace("ipfs://", "")
    : cidOrUri;

  try {
    await axios.delete(
      `https://api.pinata.cloud/pinning/unpin/${cid}`,
      {
        headers: {
          Authorization: `Bearer ${PINATA_JWT}`,
        },
      }
    );
  } catch (err) {
    throw new Error(`Pinata unpin failed for ${cid}: ${err.message}`);
  }
}
