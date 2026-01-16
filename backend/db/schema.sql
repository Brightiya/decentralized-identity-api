-- ============================================
-- PIMV PostgreSQL Schema
-- Purpose: Consent & Disclosure Audit Log + Authentication
-- Date: January 2026
-- ============================================

-- Enable cryptographic UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================
-- 1. Authentication & User Tables
-- ============================================

/*
IMPORTANT ARCHITECTURAL NOTE
----------------------------
- The `role` column is LEGACY and NON-AUTHORITATIVE
- It exists only for backward compatibility
- Actual access control MUST be derived from JWT session role
- This column MUST NOT be used for authorization decisions
*/

-- Users table (SIWE-based identities)
CREATE TABLE IF NOT EXISTS users (
  id          SERIAL PRIMARY KEY,

  -- Ethereum address (SIWE identity)
  eth_address TEXT UNIQUE NOT NULL,

  -- LEGACY ROLE (DO NOT USE FOR AUTHORIZATION)
  role        TEXT NOT NULL DEFAULT 'USER'
              CHECK (role IN ('USER', 'ADMIN', 'VERIFIER')),

  created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_login  TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE users IS
'Core user records linked to Ethereum addresses via SIWE authentication';

COMMENT ON COLUMN users.eth_address IS
'Normalized Ethereum address (SIWE subject identifier)';

COMMENT ON COLUMN users.role IS
'LEGACY / DEFAULT role only. NOT authoritative. Actual role is chosen at login and stored in JWT';

COMMENT ON COLUMN users.created_at IS
'Timestamp of first successful sign-in (account creation)';

COMMENT ON COLUMN users.last_login IS
'Timestamp of most recent successful authentication';

CREATE INDEX IF NOT EXISTS idx_users_eth_address
  ON users(eth_address);

-- NEW: Profiles table (linked to users for extensible data)
CREATE TABLE IF NOT EXISTS profiles (
  id            SERIAL PRIMARY KEY,
  user_id       INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  gender        TEXT CHECK (gender IN ('male', 'female', 'non-binary', 'genderqueer', 'transgender', 'prefer-not-to-say', 'other')),
  pronouns      TEXT,
  bio           TEXT,
  online_links  JSONB,
  preferences   JSONB,
  updated_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE profiles IS
'Extensible user profile data, treated as claims in "profile" context for consents/disclosures';

CREATE INDEX IF NOT EXISTS idx_profiles_user_id
  ON profiles(user_id);

-- ============================================
-- 1.1 Optional: Login Audit (NON-BREAKING)
-- ============================================

CREATE TABLE IF NOT EXISTS login_audit (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  eth_address  TEXT NOT NULL,
  login_role   TEXT NOT NULL
               CHECK (login_role IN ('USER', 'ADMIN', 'VERIFIER')),
  logged_in_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE login_audit IS
'Optional audit trail of login role selection (session-based, not persistent permissions)';

COMMENT ON COLUMN login_audit.login_role IS
'Role selected at login time (session scope only)';

-- ============================================
-- 2. SIWE Nonces (unchanged)
-- ============================================

CREATE TABLE IF NOT EXISTS nonces (
  nonce       TEXT PRIMARY KEY,
  address     TEXT NOT NULL,
  expires_at  TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_nonces_expires 
  ON nonces(expires_at);

COMMENT ON TABLE nonces IS
'Temporary storage of SIWE nonces to prevent replay attacks';

COMMENT ON COLUMN nonces.nonce IS
'Unique nonce value generated for each challenge';

COMMENT ON COLUMN nonces.address IS
'Ethereum address that requested the challenge';

COMMENT ON COLUMN nonces.expires_at IS
'Hard expiration time (usually 5 minutes)';

-- ============================================
-- 3. Consent Registry (UPDATED for flexible contexts)
-- ============================================

CREATE TABLE IF NOT EXISTS consents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  subject_did TEXT NOT NULL,
  claim_id TEXT NOT NULL,
  purpose TEXT NOT NULL,
  verifier_did TEXT,
  context TEXT,  -- CONTEXT IS NOW FLEXIBLE (custom and standard allowed)

  issued_at TIMESTAMP NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMP,
  revoked_at TIMESTAMP,

  metadata JSONB
);

CREATE INDEX IF NOT EXISTS idx_consents_subject
  ON consents(subject_did);

CREATE INDEX IF NOT EXISTS idx_consents_claim
  ON consents(claim_id);

CREATE INDEX IF NOT EXISTS idx_consents_purpose
  ON consents(purpose);

CREATE INDEX IF NOT EXISTS idx_consents_context_subject
  ON consents(subject_did, context)
  WHERE revoked_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_consents_context_ci
  ON consents (LOWER(context));

DROP INDEX IF EXISTS uniq_active_consent;

CREATE UNIQUE INDEX IF NOT EXISTS uniq_active_consent
ON consents (subject_did, claim_id, context)
WHERE revoked_at IS NULL;

COMMENT ON INDEX uniq_active_consent IS
'Prevents duplicate active (non-revoked) consents for the same subject, claim_id, and context';

-- Cleanup duplicate active consents
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
  SELECT id FROM ranked_consents WHERE rn > 1
);


-- ============================================
-- REMOVE STRICT CHECK CONSTRAINT FOR FLEXIBLE CONTEXTS
-- ============================================

ALTER TABLE consents
  DROP CONSTRAINT IF EXISTS check_context;

COMMENT ON COLUMN consents.context IS
'Flexible context label (may include custom contexts). Enforcement handled at application layer.';

-- ============================================
-- Disclosure Contexts (ALREADY FLEXIBLE, KEEP AS-IS)
-- ============================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'disclosures'::regclass
      AND conname = 'check_disclosure_context'
  ) THEN
    ALTER TABLE disclosures DROP CONSTRAINT check_disclosure_context;
  END IF;
END $$;

COMMENT ON COLUMN disclosures.context IS
'Raw disclosed context (may include custom contexts). Stored unbounded for auditability.';

CREATE INDEX IF NOT EXISTS idx_disclosures_context
  ON disclosures (context);

-- ============================================
-- 4. Disclosure Audit Log (UNCHANGED)
-- ============================================

CREATE TABLE IF NOT EXISTS disclosures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  subject_did TEXT NOT NULL,
  verifier_did TEXT NOT NULL,
  claim_id TEXT NOT NULL,
  purpose TEXT NOT NULL,
  consent BOOLEAN NOT NULL,
  disclosed_at TIMESTAMP NOT NULL DEFAULT NOW(),
  context TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_disclosures_subject
  ON disclosures(subject_did);

CREATE INDEX IF NOT EXISTS idx_disclosures_verifier
  ON disclosures(verifier_did);

CREATE INDEX IF NOT EXISTS idx_disclosures_subject_context
  ON disclosures(subject_did, context);

CREATE INDEX IF NOT EXISTS idx_disclosures_compliance
  ON disclosures(subject_did)
  WHERE context = 'compliance';

CREATE INDEX IF NOT EXISTS idx_disclosures_context_ci
  ON disclosures (LOWER(context));



COMMENT ON TABLE disclosures IS
'GDPR-compliant audit log of selective disclosures';

COMMENT ON COLUMN disclosures.context IS
'Disclosure context (identity, medical, professional, profile, or custom)';
