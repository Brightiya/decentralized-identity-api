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

-- 1️⃣ Add column as nullable first
ALTER TABLE disclosures
ADD COLUMN IF NOT EXISTS context TEXT;

-- 2️⃣ Backfill existing rows
-- Choose a safe default for historical disclosures
UPDATE disclosures
SET context = 'legacy-identity'
WHERE context IS NULL;

-- 3️⃣ Enforce NOT NULL only after data is clean
ALTER TABLE disclosures
ALTER COLUMN context SET NOT NULL;


-- --------------------------------------------
-- Indexes for audit queries
-- --------------------------------------------
CREATE INDEX IF NOT EXISTS idx_disclosures_subject
  ON disclosures(subject_did);

CREATE INDEX IF NOT EXISTS idx_disclosures_verifier
  ON disclosures(verifier_did);

CREATE INDEX IF NOT EXISTS idx_disclosures_subject_context
  ON disclosures(subject_did, context);

CREATE INDEX IF NOT EXISTS idx_disclosures_compliance
  ON disclosures (subject_did)
  WHERE context = 'compliance';



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

COMMENT ON COLUMN disclosures.context IS
'Disclosure context (e.g. identity, medical, professional)';

COMMENT ON COLUMN disclosures.verifier_did IS
'DID of the verifier / relying party OR system actor (e.g. SYSTEM:GDPR)';


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

  -- Consent context (REQUIRED for scoped consent)
  context TEXT,

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

-- Active consent lookup (context-aware)
CREATE INDEX IF NOT EXISTS idx_consents_context_subject
  ON consents(subject_did, context)
  WHERE revoked_at IS NULL;


-- --------------------------------------------
-- DATA CLEANUP: Revoke duplicate active consents
-- Keep the most recent issued_at per subject+claim+context
-- --------------------------------------------

  WITH ranked_consents AS (
    SELECT
      id,
      ROW_NUMBER() OVER (
        PARTITION BY subject_did, claim_id, context
        ORDER BY issued_at DESC
      ) AS rn
    FROM consents
    WHERE revoked_at IS NULL
  )
  UPDATE consents
  SET revoked_at = NOW()
  WHERE id IN (
    SELECT id
    FROM ranked_consents
    WHERE rn > 1
  );


-- --------------------------------------------
-- FIX: Correct unique constraint (context-aware)
-- --------------------------------------------
DROP INDEX IF EXISTS uniq_active_consent;

CREATE UNIQUE INDEX IF NOT EXISTS uniq_active_consent
ON consents (subject_did, claim_id, context)
WHERE revoked_at IS NULL;

-- --------------------------------------------
-- DATA MIGRATION (ONE-TIME, SAFE)
-- --------------------------------------------
-- Existing rows were created before `context`
-- Based on provided data, all current claims
-- belong to the `identity` context
-- --------------------------------------------
UPDATE consents
SET context = 'identity'
WHERE context IS NULL
  AND claim_id LIKE 'identity.%';

-- --------------------------------------------
-- Optional comment documentation
-- --------------------------------------------
COMMENT ON TABLE consents IS
'GDPR-compliant registry of active consents (source of truth for verifiers)';

COMMENT ON COLUMN consents.subject_did IS
'DID of the data subject granting consent';

COMMENT ON COLUMN consents.claim_id IS
'Claim identifier this consent applies to (e.g. identity.email)';

COMMENT ON COLUMN consents.purpose IS
'Purpose for which consent is granted (purpose limitation)';

COMMENT ON COLUMN consents.verifier_did IS
'Optional: specific verifier DID this consent applies to (NULL = any)';

COMMENT ON COLUMN consents.context IS
'Context scope (e.g. identity, medical, professional)';

COMMENT ON COLUMN consents.issued_at IS
'Timestamp when consent was granted';

COMMENT ON COLUMN consents.expires_at IS
'Optional expiration timestamp';

COMMENT ON COLUMN consents.revoked_at IS
'Timestamp when consent was revoked (NULL = active)';

COMMENT ON COLUMN consents.metadata IS
'Optional JSON metadata (future-proofing)';
