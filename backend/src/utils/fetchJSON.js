import axios from "axios";

const PINATA_GATEWAY = process.env.PINATA_GATEWAY || "https://gateway.pinata.cloud/ipfs/";

export async function fetchJSON(cidOrUrl) {
  const url = cidOrUrl.startsWith("http") ? cidOrUrl : `${PINATA_GATEWAY}${cidOrUrl}`;
  try {
    const res = await axios.get(url, { timeout: 15000 });
    return res.data;
  } catch (err) {
    throw new Error(`Failed to fetch from IPFS: ${err.message}`);
  }
}
