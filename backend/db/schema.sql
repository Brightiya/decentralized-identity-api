-- ============================================
-- PIMV PostgreSQL Schema
-- Purpose: Consent & Disclosure Audit Log
-- ============================================

-- Enable cryptographic UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- --------------------------------------------
-- Disclosure audit table
-- --------------------------------------------
CREATE TABLE IF NOT EXISTS disclosures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Data subject DID (owner of the identity)
  subject_did TEXT NOT NULL,

  -- Verifier / relying party DID
  verifier_did TEXT NOT NULL,

  -- Identifier of the disclosed claim
  claim_id TEXT NOT NULL,

  -- GDPR purpose limitation
  purpose TEXT NOT NULL,

  -- Explicit consent flag
  consent BOOLEAN NOT NULL,

  -- Timestamp of disclosure
  disclosed_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- --------------------------------------------
-- Indexes for audit queries
-- --------------------------------------------
CREATE INDEX IF NOT EXISTS idx_disclosures_subject
  ON disclosures(subject_did);

CREATE INDEX IF NOT EXISTS idx_disclosures_verifier
  ON disclosures(verifier_did);

-- --------------------------------------------
-- Optional comment documentation
-- --------------------------------------------
COMMENT ON TABLE disclosures IS
'GDPR-compliant audit log of selective disclosures (no personal data stored)';

COMMENT ON COLUMN disclosures.subject_did IS
'DID of the data subject';

COMMENT ON COLUMN disclosures.verifier_did IS
'DID of the verifier / relying party';

COMMENT ON COLUMN disclosures.claim_id IS
'Identifier of the disclosed claim';

COMMENT ON COLUMN disclosures.purpose IS
'Declared GDPR purpose for disclosure';

COMMENT ON COLUMN disclosures.consent IS
'Explicit consent granted by the data subject';

COMMENT ON COLUMN disclosures.disclosed_at IS
'Timestamp when disclosure occurred';

-- --------------------------------------------
-- Consent registry (GDPR source of truth)
-- --------------------------------------------
CREATE TABLE IF NOT EXISTS consents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Data subject (owner of the identity)
  subject_did TEXT NOT NULL,

  -- Claim this consent applies to
  claim_id TEXT NOT NULL,

  -- Purpose limitation
  purpose TEXT NOT NULL,

  -- Optional verifier scoping (NULL = any verifier)
  verifier_did TEXT,

  -- Consent lifecycle
  issued_at TIMESTAMP NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMP,
  revoked_at TIMESTAMP,

  -- Free-form metadata (optional, future-proofing)
  metadata JSONB
);

-- --------------------------------------------
-- Indexes for fast verification
-- --------------------------------------------
CREATE INDEX IF NOT EXISTS idx_consents_subject
  ON consents(subject_did);

CREATE INDEX IF NOT EXISTS idx_consents_claim
  ON consents(claim_id);

CREATE INDEX IF NOT EXISTS idx_consents_purpose
  ON consents(purpose);

CREATE INDEX IF NOT EXISTS idx_consents_active
  ON consents(subject_did, claim_id, purpose)
  WHERE revoked_at IS NULL;

CREATE UNIQUE INDEX uniq_active_consent
ON consents (subject_did, claim_id, purpose)
WHERE revoked_at IS NULL;



--- How to apply it (one-time):
--psql postgresql://pimv_user:strongpassword@localhost:5432/pimv_db -f backend/db/schema.sql
