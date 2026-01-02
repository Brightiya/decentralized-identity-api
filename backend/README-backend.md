# Backend README (Pinata)

## Setup

1. Copy `.env.example` → `.env` and fill values (especially PINATA_API_KEY / PINATA_SECRET_API_KEY).
2. Install dependencies:

   ```bash
   cd backend
   yarn install
3. Start a local Hardhat node (optional, for contract interactions): `npx hardhat node`

4. Deploy IdentityRegistry contract (optional local deploy): `npx hardhat run --network localhost ./scripts/deploy.mjs`(from main directory)
   Copy deployed address to IDENTITY_REGISTRY_ADDRESS in .env.
5. Start server: npm run dev or (from backend directory) or yarn --cwd backend dev(from frontend dir.)

Example endpoints

+ POST /api/profile — create profile and upload JSON to Pinata (body must include owner property)

+ GET /api/profile/:address — fetch on-chain CID for address then retrieve JSON from Pinata

+ POST /api/did/register — register DID (setProfileCID on-chain)

+ GET /api/did/:address — read DID info (on-chain)

+ POST /api/vc/issue — issue demo VC JWT

+ POST /api/vc/verify — verify demo VC JWT

// DB:
  In your project root (where backend/ is)

  1. Connect as the default superuser (no password needed)
   Run this — it will connect without asking for a password:
   psql postgres
  2. Create the pimv_user and pimv_db exactly as in your .env
   Inside the psql prompt, run these commands one by one:
   CREATE USER pimv_user WITH PASSWORD 'strongpassword' CREATEDB;

   CREATE DATABASE pimv_db OWNER pimv_user;

   -- Optional: Grant all privileges (good for dev)
   GRANT ALL PRIVILEGES ON DATABASE pimv_db TO pimv_user;
   Then quit: \q
 3. Now run your schema file:
    psql "$DATABASE_URL" -f backend/db/schema.sq(if this fails), run:
    psql postgresql://pimv_user:strongpassword@localhost:5432/pimv_db -f backend/db/schema.sql
 4. test with:
    psql postgresql://pimv_user:strongpassword@localhost:5432/pimv_db

did:ethr:0x70997970C51812dc3A010C7d01b50e0d17dc79C8
 name
 QmSe2TeXUE5GtqbAnYoB1XbWdmTM3srfNtsms2DGti9GF4

 email
Qmf2wTrBDXXBTnn4DXMeBM9ebj739Efwewe8bRAaoSki1C
