// backend/src/utils/pinata.js
import PinataSDK from "@pinata/sdk";
import axios from "axios";
import FormData from 'form-data';

const PINATA_JWT = process.env.PINATA_JWT;

/**
 * Ordered fallback gateways — public/trustless first, then Pinata (last resort)
 * Public gateways can read content from ANY Pinata/nft.storage pinned content
 */
const IPFS_GATEWAYS = [
  "https://ipfs.io/ipfs/",           // Official, trustless
  "https://dweb.link/ipfs/",         // IPFS Foundation, reliable
  "https://gateway.ipfs.io/ipfs/",   // Cloudflare mirror
  "https://ipfs.ethere.link/ipfs/",  // Ethereum-based
  "https://gateway.pinata.cloud/ipfs/", // Your Pinata gateway
  process.env.PINATA_GATEWAY || "https://gateway.pinata.cloud/ipfs/" // custom/fallback
].filter(Boolean);

if (!PINATA_JWT) {
  console.warn("⚠️ Missing PINATA_JWT in .env. Shared Pinata uploads/unpins will fail.");
}

const pinata = new PinataSDK({ pinataJWTKey: PINATA_JWT });

/**
 * Upload JSON — supports nft.storage (preferred) or Pinata fallback
 * @param {Object} json - The JSON object to upload
 * @param {string} [pinataJwt=null] - Optional user-provided Pinata JWT
 * @param {string} [nftStorageKey=null] - Optional nft.storage API key (highest priority)
 * @returns {Promise<string>} ipfs:// URI
 */
export async function uploadJSON(json, pinataJwt = null, nftStorageKey = null) {
  // Priority 1: nft.storage (free, decentralized)
  if (nftStorageKey) {
    console.log('[uploadJSON] Using nft.storage (preferred)');
    return await uploadToNftStorage(json, nftStorageKey);
  }

  // Priority 2: User-provided Pinata JWT
  const effectivePinataJwt = pinataJwt || PINATA_JWT;

  if (!effectivePinataJwt) {
    throw new Error("No pinning service available (nft.storage nor Pinata)");
  }

  // Security warning for shared Pinata key
  if (!pinataJwt && process.env.NODE_ENV !== "development") {
    console.warn(
      "[SECURITY] Using shared Pinata JWT in production - strongly recommend per-user keys"
    );
  }

  console.log('[uploadJSON] Using Pinata');
  try {
    const result = await pinata.pinJSONToIPFS(json, {
      pinataJWTKey: effectivePinataJwt
    });
    return `ipfs://${result.IpfsHash}`;
  } catch (err) {
    throw new Error(`Pinata upload failed: ${err.message}`);
  }
}

/**
 * Helper: Upload directly to nft.storage
 * @param {Object} json - Data to upload
 * @param {string} apiKey - nft.storage API key
 */
async function uploadToNftStorage(json, apiKey) {
  if (!apiKey) {
    throw new Error("nft.storage API key required");
  }

  const form = new FormData();
  form.append('file', new Blob([JSON.stringify(json, null, 2)], { type: 'application/json' }), 'metadata.json');

  try {
    const res = await axios.post('https://api.nft.storage/upload', form, {
      headers: {
        ...form.getHeaders(),
        Authorization: `Bearer ${apiKey}`
      },
      timeout: 60000 // nft.storage can be slower sometimes
    });

    if (!res.data.ok) {
      throw new Error(res.data.error?.message || 'nft.storage upload failed');
    }

    return `ipfs://${res.data.value.cid}`;
  } catch (err) {
    throw new Error(`nft.storage upload failed: ${err.response?.data?.message || err.message}`);
  }
}

/**
 * Fetch JSON from IPFS with gateway rotation + retries
 * @param {string} cidOrUrl - CID or full URL
 * @param {number} [retries=3] - Number of retry attempts per gateway
 * @param {string} [preferredGateway=null] - User-provided gateway to try first
 */
export async function fetchJSON(cidOrUrl, retries = 3, preferredGateway = null) {
  const cid = cidOrUrl.startsWith("ipfs://")
    ? cidOrUrl.replace("ipfs://", "")
    : cidOrUrl;

  // Build dynamic gateway list: preferred first, then fallbacks
  const gateways = [
    ...(preferredGateway ? [preferredGateway] : []),
    ...IPFS_GATEWAYS
  ];

  let lastError = null;

  for (const gateway of gateways) {
    const url = cid.startsWith("http") ? cid : `${gateway}${cid}`;

    console.log(`[fetchJSON] Trying gateway: ${url}`);

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
 * @param {string} [jwt] - Optional user-provided Pinata JWT
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