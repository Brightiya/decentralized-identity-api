# 🛡️ PIMV — Privacy Identity Management Vault

**PIMV (Privacy Identity Management Vault)** is a **hybrid identity management system** that combines **decentralized verifiable credentials** with **centralized consent and audit enforcement**, designed to meet **GDPR and real-world regulatory requirements**.

> 🔑 **Key idea**:
> PIMV is **not a pure decentralized identity system**.
> It is a **hybrid architecture by design**, balancing **user sovereignty**, **privacy**, and **legal compliance**.

---

## 📌 Why PIMV Exists

Pure decentralized identity systems struggle with:

* GDPR compliance (revocation, purpose limitation, auditability)
* Consent enforcement
* Enterprise and legal accountability

Pure centralized identity systems struggle with:

* User control
* Portability
* Data minimization
* Trust

**PIMV bridges both worlds.**

---

## 🧠 Core Principles

* **User-controlled identity claims**
* **Verifiable Credentials (W3C)**
* **Explicit, purpose-bound consent**
* **Data minimization**
* **Auditability**
* **GDPR compliance by construction**
* **Hybrid (on-chain + off-chain) trust model**

---

## 🏗️ Architecture Overview (Hybrid by Design)

```markdown
┌────────────┐      ┌────────────┐      ┌───────────────┐
│   Subject  │      │  Verifier  │      │    Issuer     │
│  (User)    │      │ (Service)  │      │ (Authority)  │
└─────┬──────┘      └─────┬──────┘      └──────┬────────┘
      │                   │                    │
      │        Consent + Purpose                │
      │──────────────────────────────────────▶ │
      │                   │                    │
      │        VC CID      │                    │
      │──────────────────▶│                    │
      │                   │                    │
      │                   ▼                    │
      │           Verification API              │
      │                   │                    │
      ▼                   ▼                    ▼
┌─────────────────────────────────────────────────────────┐
│                  PIMV Backend (Hybrid)                   │
│                                                         │
│  🔹 Ethereum Smart Contract (Anchors only)              │
│     - claimId → hash(CID)                                │
│     - tamper-proof existence proof                      │
│                                                         │
│  🔹 IPFS (Pinata)                                       │
│     - Full Verifiable Credentials                       │
│                                                         │
│  🔹 PostgreSQL                                         │
│     - Consents                                         │
│     - Purpose enforcement                              │
│     - Revocation                                       │
│     - Disclosure logs                                  │
└─────────────────────────────────────────────────────────┘
```

---

## 🔄 What Is Decentralized in PIMV?

✅ **Verifiable Credentials**

* Issued following W3C VC standards
* Signed cryptographically by issuer
* Stored on IPFS (content-addressed)

✅ **On-chain Anchoring**

* Only a **hash of the VC CID** is stored on-chain
* Prevents tampering
* No personal data on-chain

---

## 🏛️ What Is Centralized (Intentionally)?

❗ **Consent Management**

* Purpose-bound consent
* Expiry & revocation
* Enforced at verification time

❗ **Disclosure Enforcement**

* Ensures only authorized claims are disclosed
* Prevents over-sharing

❗ **Audit & Compliance**

* Disclosure logs
* Revocation tracking
* GDPR accountability

> ⚠️ This is **intentional**, not a flaw.
> GDPR **requires** an accountable controller.

---

## 📜 GDPR Compliance Mapping

| GDPR Requirement           | PIMV Implementation  |
| -------------------------- | -------------------- |
| Lawfulness (Art.6)         | Explicit consent     |
| Purpose limitation (Art.5) | Purpose-bound checks |
| Data minimization (Art.5)  | Single-claim VCs     |
| Right to revoke (Art.7)    | Consent revocation   |
| Right to erasure (Art.17)  | Credential erasure   |
| Accountability (Art.5)     | Disclosure logs      |

---

## 🔐 Identity Model

### Claim ID Convention

```code
identity.email
identity.name
identity.age
```

Each VC contains **exactly one claim**.

---

## 🧾 Verifiable Credential Structure

```json
{
  "@context": ["https://www.w3.org/2018/credentials/v1"],
  "type": ["VerifiableCredential"],
  "issuer": "did:ethr:0xIssuer",
  "issuanceDate": "2025-01-01T00:00:00Z",
  "credentialSubject": {
    "id": "did:ethr:0xSubject",
    "claim": {
      "email": "kate@gmail.com"
    }
  },
  "pimv": {
    "claimId": "identity.email",
    "context": "kyc",
    "consents": [{
      "purpose": "Email verification",
      "grantedAt": "...",
      "expiresAt": null,
      "revokedAt": null
    }]
  },
  "proof": {
    "type": "EcdsaSecp256k1Signature2019",
    "jws": "0x..."
  }
}
```

---

## 🔗 On-Chain Anchoring (Minimal & Safe)

Only this is stored on-chain:

```solidity
mapping(address => mapping(bytes32 => bytes32)) claims;
// subject → claimId → keccak256(CID)
```

✅ No personal data
✅ No PII
✅ Immutable proof of issuance

---

## 🔍 Verification Flow (Step-by-Step)

1. Verifier requests specific claim(s) + purpose
2. Subject provides VC CID(s)
3. Backend:

   * Fetches VC from IPFS
   * Verifies signature
   * Verifies on-chain anchor
   * Checks valid consent
   * Enforces purpose
   * Minimizes disclosure
4. Only authorized fields are returned

---

## 📡 API Overview

### Issue VC

```code
POST /api/vc/issue
```

### Verify VC

```code
POST /api/vc/verify
```

### Grant Consent

```code
POST /api/consents/grant
```

### Revoke Consent

```code
POST /api/consents/revoke
```

---

## 🧪 Example Verification Result

```json
{
  "message": "✅ Credentials verified with enforced disclosure",
  "disclosed": {
    "identity.email": "kate@gmail.com",
    "identity.name": "Kate"
  },
  "denied": {}
}
```

---

## ⚠️ Why PIMV Is Not Purely Decentralized

| Pure DID Systems       | PIMV             |
| ---------------------- | ---------------- |
| No consent enforcement | Explicit consent |
| No purpose control     | Purpose-bound    |
| Hard GDPR compliance   | GDPR-native      |
| No auditability        | Full audit logs  |

👉 **PIMV prioritizes real-world deployability over ideology.**

---

## 🚀 Who Is PIMV For?

* Regulated platforms
* Identity verification services
* Universities
* Healthcare portals
* Financial services
* Privacy-first SaaS products

---

## 🧭 Roadmap

* Zero-Knowledge Proof integration
* Selective disclosure credentials
* Multi-chain support
* Consent receipts export
* Privacy dashboards

---

## 🏁 Final Statement

> **PIMV is a hybrid privacy-first identity system,
> not because decentralization failed —
> but because compliance, trust, and reality matter.**

If you want, I can also provide:

* 📊 Architecture diagram (SVG)
* 📘 Academic-style system model
* 🔐 Threat model
* 🧪 API test collection
* 🎓 Thesis-ready explanation

Just tell me.
