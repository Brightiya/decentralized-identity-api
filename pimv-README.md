# PIMV – Personal Identity Management Vault

## **A Hybrid Self-Sovereign Identity (SSI) System with GDPR Compliance**

PIMV is a full-featured, privacy-first digital identity wallet that gives individuals complete control over their personal data while ensuring verifiable credentials and regulatory compliance.

It combines decentralized identity standards (DIDs, Verifiable Credentials) with a minimal centralized audit layer for GDPR accountability.

## Core Principles

- **You own your identity** – Private keys never leave your wallet
- **Selective disclosure** – Share only what is needed, when needed
- **Explicit consent** – No data shared without your approval and defined purpose
- **Verifiable & immutable** – Credentials cryptographically signed and anchored on-chain
- **GDPR compliant** – Audit trail, data portability, right to erasure

## Architecture Overview

| Component              | Technology                  | Role                                      |
|------------------------|-----------------------------|-------------------------------------------|
| Identifiers            | `did:ethr` (Ethereum-based) | Decentralized, user-controlled DIDs       |
| Credentials            | W3C Verifiable Credentials  | Standard format, stored on IPFS           |
| Storage                | IPFS (via Pinata)           | Decentralized, immutable credential storage |
| Anchoring              | Ethereum (Hardhat local)    | On-chain proof of existence & integrity   |
| Profile Management     | On-chain registry           | Points DID to current profile CID         |
| Audit & Compliance     | PostgreSQL                  | Disclosure logs (GDPR Art. 15, 30)        |
| Frontend               | Angular 17+                 | Beautiful, responsive UI                  |
| Backend                | Node.js / Express           | Mediation, verification, compliance       |

## Features

- Wallet connection (MetaMask or compatible)
- Issue context-aware verifiable credentials
- Manage disclosure contexts (personal, professional, legal, health, custom)
- Grant/revoke consent
- View disclosure history (who accessed what and why)
- Export disclosure report (GDPR data portability)
- Right to Erasure (GDPR Art. 17) with on-chain tombstone
- Advanced tools: DID resolution, raw VC validation
- Dark mode, responsive design

## Getting Started (Local Development)

### Prerequisites

- Node.js ≥ 22.10.0
- Yarn 4.5.1
- PostgreSQL (local or Docker)
- MetaMask browser extension

### 1. Clone and Install

```bash
git clone https://github.com/yourusername/decentralized-identity-api-main.git
cd decentralized-identity-api-main

# Install dependencies
yarn install
```

### 2. Setup PostgreSQL

```bash
# Connect as superuser
psql postgres

# Create user and database
CREATE USER pimv_user WITH PASSWORD 'strongpassword' CREATEDB;
CREATE DATABASE pimv_db OWNER pimv_user;
GRANT ALL PRIVILEGES ON DATABASE pimv_db TO pimv_user;
\q

# Apply schema
psql postgresql://pimv_user:strongpassword@localhost:5432/pimv_db -f backend/db/schema.sql
```

### 3. Environment Configuration

Copy example env files and update as needed:

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

Key variables in `backend/.env`:

- `DATABASE_URL=postgresql://pimv_user:strongpassword@localhost:5432/pimv_db`
- `PRIVATE_KEY` (test account – never use mainnet keys)
- Pinata credentials

### 4. Run the Application

```bash
# Terminal 1: Start Hardhat node
yarn --cwd backend start:node

# Terminal 2: Start backend
yarn --cwd backend dev

# Terminal 3: Start frontend
yarn --cwd frontend dev
```

Open <http://localhost:4200>

## User Guide

### 1. Connect Wallet

- Click "Connect Wallet" in top bar
- Approve in MetaMask
- Your address and DID appear

### 2. Issue a Credential

1. Go to **Credentials**
2. Select context (e.g., "personal")
3. Enter:
   - Claim ID: `identity.email`
   - Claim JSON: `{"email": "you@example.com"}`
4. Click "Issue Credential"
5. Success → credential stored on IPFS, anchored on-chain

### 3. Register & Resolve DIDs

- **Registration**: Automatic on first credential issuance (profile created on-chain)
- **Resolution**:
  - Go to **Advanced → Resolve DID**
  - Enter address or full DID
  - View current profile and credentials

### 4. Sign Verifiable Credentials

- Signing happens automatically during issuance
- Backend signs VC with its key after user consent
- Proof uses `EcdsaSecp256k1Signature2019`

### 5. Verify a Credential

#### In App (Advanced Tools)

1. Issue a credential → copy **gatewayUrl**
2. Open URL → copy full VC JSON
3. Go to **Advanced → Verify Credential**
4. Paste VC → click "Verify Credential"
5. Success confirms signature + on-chain anchor

#### As a Verifier (API)

```bash
curl -X POST http://localhost:4000/api/vc/verify \
  -d '{
    "cid": "YOUR_CID",
    "claimId": "identity.email",
    "subject": "did:ethr:0xf39F...",
    "verifierDid": "did:ethr:0x7099...",
    "purpose": "credential issuance",
    "consent": true
  }'
```

### 6. Manage Consent & Disclosure

- **Contexts**: Add custom contexts
- **Consent**: Grant explicit consent for non-default contexts
- **Disclosures**: See audit log of all verifications

### 7. Exercise Right to Erasure (GDPR)

1. Go to **GDPR**
2. Connect wallet
3. Check confirmation box
4. Click "Erase My Profile"
5. Profile replaced with on-chain tombstone
6. Old data inaccessible

## Technical Details

### Credential Issuance Flow

1. User connects wallet + grants consent
2. Backend creates W3C VC with `pimv` extension (context, consent, claimId)
3. Signs with backend key
4. Uploads to IPFS → CID
5. Anchors hash on-chain via `setClaim`
6. Updates profile CID

### Verification Flow

1. Verifier calls `/api/vc/verify`
2. Backend enforces purpose/consent
3. Validates signature & on-chain hash
4. Logs disclosure in PostgreSQL
5. Returns success

### Right to Erasure

1. Unpins old CIDs (best-effort)
2. Creates tombstone profile with `[ERASED]`
3. Updates on-chain pointer
4. Provides cryptographic proof

## Shortcomings & Limitations

While PIMV is a strong hybrid SSI implementation, it has some current limitations:

- **Single-chain**: Only Ethereum/Hardhat (local) — no multi-chain support
- **Backend signer**: Credentials signed by backend key, not user's wallet (common pattern for usability, but reduces "pure" self-sovereignty)
- **IPFS pinning**: Relies on Pinata (centralized gateway) — data could disappear if unpinned
- **No ZK proofs**: Selective disclosure is context-based, not zero-knowledge
- **No revocation**: Credentials cannot be revoked yet
- **Local-only testing**: Designed for Hardhat node — not mainnet-ready without changes
- **No mobile support**: Web-only
- **Limited verifier integration**: No built-in verifier portal

These are planned for future versions.

## Privacy & Security

- No personal data stored on backend
- Only metadata in PostgreSQL (no PII)
- All credentials encrypted at rest (IPFS)
- Private keys never leave browser
- Consent enforced cryptographically

## Future Enhancements

- User-signed credentials
- Zero-knowledge selective disclosure
- Multi-chain support
- Mobile app
- Revocation lists
- Verifier dashboard
- Hardware wallet integration

---

### **Built with passion on December 25, 2025**

PIMV proves that true privacy and regulatory compliance can coexist in decentralized systems.

**You own your identity. You control your data.**

Welcome to the future of digital identity.

❤️
