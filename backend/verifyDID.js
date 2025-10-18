// verifyDID.js
import { ethers } from "ethers";
import fetch from "node-fetch";
import dotenv from "dotenv";

dotenv.config();

// 🔧 Configure your environment
const backendUrl = "http://localhost:4000/api/did/verify"; // backend endpoint
const privateKey = process.env.PRIVATE_KEY; // your wallet private key
const provider = new ethers.JsonRpcProvider(process.env.PROVIDER_URL);

const signer = new ethers.Wallet(privateKey, provider);
const address = await signer.getAddress();

async function verifyDID() {
  try {
    // 1️⃣ Build DID message
    const did = `did:ethr:${address}`;
    const message = `Verifying DID ownership for ${did}`;

    // 2️⃣ Sign message with private key
    const signature = await signer.signMessage(message);
    console.log("🪪 DID:", did);
    console.log("✍️  Signature:", signature);

    // 3️⃣ Send verification request to backend
    const response = await fetch(backendUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        address,
        signature,
      }),
    });

    const data = await response.json();

    console.log("\n✅ Verification Response:");
    console.log(JSON.stringify(data, null, 2));
  } catch (err) {
    console.error("❌ Error verifying DID:", err);
  }
}

verifyDID();
