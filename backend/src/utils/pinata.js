// backend/src/utils/pinata.js
import { PinataSDK } from "pinata-web3";
import dotenv from "dotenv";
import axios from "axios";

dotenv.config();

const PINATA_JWT = process.env.PINATA_JWT;
const PINATA_GATEWAY = process.env.PINATA_GATEWAY || "https://gateway.pinata.cloud/ipfs/";

if (!PINATA_JWT) {
  console.warn("⚠️ Missing PINATA_JWT. Pinata uploads will fail.");
}

const pinata = new PinataSDK({
  pinataJwt: PINATA_JWT,
});

export async function uploadJSON(json) {
  try {
    const result = await pinata.upload.json(json);
    return `ipfs://${result.IpfsHash}`;
  } catch (err) {
    throw new Error(`Pinata upload failed: ${err.message}`);
  }
}

export async function fetchJSON(cidOrUrl) {
  const url = cidOrUrl.startsWith("http")
    ? cidOrUrl
    : `${PINATA_GATEWAY}${cidOrUrl}`;
  try {
    const res = await axios.get(url, { timeout: 15000 });
    return res.data;
  } catch (err) {
    throw new Error(`Failed to fetch JSON from IPFS: ${err.message}`);
  }
}
