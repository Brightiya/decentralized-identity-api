import { ethers } from "ethers";
import { fetchJSON, uploadJSON, unpinCID } from "../utils/pinata.js";

/**
 * GDPR Art.17 – Right to Erasure (Logical + Best-effort Physical)
 */
export const eraseProfile = async (req, res) => {
  try {
    const { did } = req.body;
    if (!did) {
      return res.status(400).json({ error: "DID required" });
    }

    const address = did.split(":").pop();

    // 1️⃣ Fetch current profile CID
    const cid = await globalThis.registry.getProfileCID(address);
    if (!cid) {
      return res.status(404).json({ error: "Profile not found" });
    }

    const profile = await fetchJSON(cid);

    // 2️⃣ Collect CIDs (best-effort unpin)
    const cidsToUnpin = new Set([cid]);
    (profile.credentials || []).forEach(c => c.cid && cidsToUnpin.add(c.cid));

    for (const c of cidsToUnpin) {
      try { await unpinCID(c); } catch {}
    }

    // 3️⃣ Create tombstone profile
    const erasedProfile = {
      id: did,
      credentialSubject: { id: "[ERASED]" },
      credentials: [],
      erasedAt: new Date().toISOString(),
      gdpr: { article: "17", action: "erasure" }
    };

    const erasedUri = await uploadJSON(erasedProfile);
    const erasedCid = erasedUri.replace("ipfs://", "");

    // 4️⃣ Update on-chain pointer
    const tx = await globalThis.registry.setProfileCID(address, erasedCid);
    await tx.wait();

    // 5️⃣ Erasure proof
    const erasureProof = ethers.keccak256(
      ethers.toUtf8Bytes(JSON.stringify({
        did,
        erasedCid,
        timestamp: new Date().toISOString()
      }))
    );

    return res.json({
      message: "✅ GDPR erasure enforced",
      did,
      erasedCid,
      erasureProof
    });

  } catch (err) {
    console.error("❌ GDPR erase error:", err);
    res.status(500).json({ error: err.message });
  }
};
