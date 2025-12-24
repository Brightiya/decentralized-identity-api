# Backend README (Pinata)

## Setup

1. Copy `.env.example` → `.env` and fill values (especially PINATA_API_KEY / PINATA_SECRET_API_KEY).
2. Install dependencies:

   ```bash
   cd backend
   npm install
3. Start a local Hardhat node (optional, for contract interactions): `npx hardhat node`

4. Deploy IdentityRegistry contract (optional local deploy): `npx hardhat run --network localhost ./scripts/deploy.mjs`(from main directory)
   Copy deployed address to IDENTITY_REGISTRY_ADDRESS in .env.
5. Start server: npm run dev (from backend directory)

Example endpoints

+ POST /api/profile — create profile and upload JSON to Pinata (body must include owner property)

+ GET /api/profile/:address — fetch on-chain CID for address then retrieve JSON from Pinata

+ POST /api/did/register — register DID (setProfileCID on-chain)

+ GET /api/did/:address — read DID info (on-chain)

+ POST /api/vc/issue — issue demo VC JWT

+ POST /api/vc/verify — verify demo VC JWT
