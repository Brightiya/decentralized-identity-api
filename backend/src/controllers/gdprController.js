// backend/src/controllers/gdprController.js
import { ethers } from "ethers";
import { fetchJSON, uploadJSON, unpinCID } from "../utils/pinata.js";
import { pool } from "../utils/db.js";

/**
 * Normalize DID → address (consistent with other controllers)
 */
const didToAddress = (didOrAddress) => {
  if (!didOrAddress) return didOrAddress;
  if (didOrAddress.startsWith("did:")) {
    return didOrAddress.split(":").pop().toLowerCase();
  }
  return didOrAddress.toLowerCase();
};

/**
 * GDPR Art.17 – Right to Erasure (Logical + Best-effort Physical)
 */
export const eraseProfile = async (req, res) => {
  try {
    const { did } = req.body;
    if (!did) {
      return res.status(400).json({ error: "DID required" });
    }

    const address = didToAddress(did);

    // 1️⃣ Fetch current profile CID
    const cid = await globalThis.registry.getProfileCID(address);
    if (!cid || cid.length === 0) {
      return res.status(404).json({ error: "Profile not found" });
    }

    const profile = await fetchJSON(cid);

    // 2️⃣ Collect CIDs for best-effort unpin (profile + all credential CIDs)
    const cidsToUnpin = new Set([cid]);
    (profile.credentials || []).forEach(c => {
      if (c.cid) cidsToUnpin.add(c.cid);
    });

    for (const c of cidsToUnpin) {
      try {
        await unpinCID(c);
      } catch (e) {
        console.warn(`Best-effort unpin failed for ${c}:`, e.message);
      }
    }

    // 3️⃣ Create tombstone profile (erasure marker)
    const erasedProfile = {
      id: `did:ethr:${address}`,
      credentialSubject: { id: "[ERASED]" },
      credentials: [],
      erasedAt: new Date().toISOString(),
      gdpr: { article: "17", action: "erasure", timestamp: new Date().toISOString() }
    };

    const erasedUri = await uploadJSON(erasedProfile);
    const erasedCid = erasedUri.replace("ipfs://", "");

    // 4️⃣ Update on-chain pointer to tombstone
    const tx = await globalThis.registry.setProfileCID(address, erasedCid);
    await tx.wait();

    // 5️⃣ Cryptographic erasure proof (for audit & accountability)
    const erasureProof = ethers.keccak256(
      ethers.toUtf8Bytes(JSON.stringify({
        did: `did:ethr:${address}`,
        erasedCid,
        timestamp: new Date().toISOString()
      }))
    );

    // 6️⃣ Log GDPR erasure in disclosures audit log (compliance)
    await pool.query(
      `
      INSERT INTO disclosures (
        subject_did,
        verifier_did,
        claim_id,
        purpose,
        consent,
        context,
        disclosed_at
      ) VALUES ($1, $2, $3, $4, $5, $6, NOW())
      `,
      [
        address,
        "SYSTEM:GDPR",
        "GDPR_ERASURE",
        "Right to Erasure (Article 17)",
        true,
        "compliance"  // fixed context for audit
      ]
    );

    return res.json({
      message: "✅ GDPR Art.17 erasure enforced",
      did: `did:ethr:${address}`,
      erasedCid,
      erasureProof,
      txHash: tx.hash
    });

  } catch (err) {
    console.error("❌ GDPR erase error:", err);
    return res.status(500).json({ error: "Internal server error during erasure" });
  }
};