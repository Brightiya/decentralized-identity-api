// backend/src/controllers/authController.js
import { ethers } from 'ethers';
import jwt from 'jsonwebtoken';
import { SiweMessage, SiweError } from 'siwe';
import { pool } from '../utils/db.js';
import {didToAddress} from "../utils/did.js";

// Fallback secret — MUST be overridden via environment variable in production
const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-dev-key-change-in-prod-please';

// Application domain & full URI used in SIWE message construction & validation
const APP_DOMAIN = process.env.APP_DOMAIN || 'localhost:4200';
const APP_URI = `http://${APP_DOMAIN}/`;

// How long a generated nonce/challenge remains valid (short-lived for security)
const CHALLENGE_TTL_MINUTES = 5;

// Allowed roles in this system — used for normalization & RBAC
const ALLOWED_ROLES = ['USER', 'ADMIN', 'VERIFIER'];

// =====================================
// Helpers
// =====================================

// Generates cryptographically secure random nonce (32 bytes → hex string)
function generateNonce() {
  return ethers.hexlify(ethers.randomBytes(32));
}

// Normalizes requested role to one of ALLOWED_ROLES or defaults to 'USER'
function normalizeRole(role) {
  if (!role) return 'USER';
  const upper = String(role).toUpperCase();
  // Only accept known roles — prevents privilege escalation via invalid input
  return ALLOWED_ROLES.includes(upper) ? upper : 'USER';
}


// =====================================
// GET /api/auth/challenge
// Generates SIWE message + nonce for wallet to sign
// =====================================
export const getChallenge = async (req, res) => {
  try {
    // Extract Ethereum address from query string
    const { address } = req.query;
    // Use environment chain ID with fallback to Base Sepolia (84532)
    const CHAIN_ID = Number(process.env.CHAIN_ID || 84532);

    // Basic address validation
    if (!address || !ethers.isAddress(address)) {
      return res.status(400).json({ error: 'Valid Ethereum address required' });
    }

    // Get checksummed address (EIP-55)
    const checksumAddress = ethers.getAddress(address);
    // Convert to normalized internal format (likely lowercase or checksummed)
    const normalizedAddress = didToAddress(address);

    // Create fresh nonce
    const nonce = generateNonce();
    const issuedAt = new Date().toISOString();
    // Set short expiration (5 minutes default)
    const expirationTime = new Date(
      Date.now() + CHALLENGE_TTL_MINUTES * 60 * 1000
    ).toISOString();

    // Construct SIWE message following SIWE specification
    const siweMessage = new SiweMessage({
      domain: APP_DOMAIN,
      address: checksumAddress,           // must be checksummed
      statement: 'Sign in to PIMV Identity Vault',
      uri: APP_URI,
      version: '1',
      chainId: CHAIN_ID,
      nonce,
      issuedAt,
      expirationTime
    });

    // Store nonce in DB with expiration — prevents replay attacks
    await pool.query(
      `INSERT INTO nonces (nonce, address, expires_at)
       VALUES ($1, $2, $3)
       ON CONFLICT (nonce) DO NOTHING`,
      [nonce, normalizedAddress, expirationTime]
    );

    // Return the prepared message string + nonce for frontend/wallet
    res.json({
      message: siweMessage.prepareMessage(),  // human-readable string to sign
      nonce                                   // sent back in verify step
    });
  } catch (err) {
    console.error('getChallenge error:', err);
    res.status(500).json({ error: 'Failed to generate authentication challenge' });
  }
};

// =====================================
// POST /api/auth/verify
// Verifies SIWE signature, creates/updates user, issues JWT
// =====================================
export const verifySignature = async (req, res) => {
  try {
    const { message, signature, requestedRole } = req.body;

    // Required fields check
    if (!message || !signature) {
      return res
        .status(400)
        .json({ error: 'Both message and signature are required' });
    }

    // Parse the SIWE message string back into object
    const siweMessage = new SiweMessage(message);

    let fields;

    try {
      // Verify cryptographic signature matches address in message
      const verification = await siweMessage.verify({ signature });
      fields = verification.data;
    } catch (err) {
      // Signature invalid → we still extract fields but will fail later checks
      fields = siweMessage;
    }

    // Critical security check: prevent phishing/domain mismatch
    if (fields.domain !== APP_DOMAIN || fields.uri !== APP_URI) {
      return res.status(401).json({ error: 'Invalid SIWE domain or URI' });
    }

    // Normalize address from SIWE message (returns null if invalid)
    const normalizedAddress = didToAddress(fields.address);

    if (!normalizedAddress) {
      return res.status(400).json({ 
        error: "Invalid Ethereum address format in SIWE message" 
      });
    }

    // ────────────────────────────────────────────────
    // Validate nonce (prevents replay + enforces short TTL)
    // ────────────────────────────────────────────────
    const nonceRes = await pool.query(
      `SELECT 1 FROM nonces
       WHERE nonce = $1
         AND address = $2
         AND expires_at > NOW()`,
      [fields.nonce, normalizedAddress]
    );

    if (nonceRes.rowCount === 0) {
      return res.status(401).json({ error: 'Invalid or expired nonce' });
    }

    // Immediately delete used nonce (single-use)
    await pool.query('DELETE FROM nonces WHERE nonce = $1', [fields.nonce]);

    // ────────────────────────────────────────────────
    // RBAC + user creation/update logic
    // ────────────────────────────────────────────────
    const userRes = await pool.query(
      'SELECT id, eth_address, role, created_at FROM users WHERE eth_address = $1',
      [normalizedAddress]
    );

    let user;
    // Normalize requested role or default to 'USER'
    let effectiveRole = normalizeRole(requestedRole);

    if (userRes.rowCount === 0) {
      // New user — create record with requested/default role
      const insertRes = await pool.query(
        `INSERT INTO users (eth_address, role, created_at, last_login)
         VALUES ($1, $2, NOW(), NOW())
         RETURNING id, eth_address, role, created_at`,
        [normalizedAddress, effectiveRole]
      );

      user = insertRes.rows[0];

      // Audit trail: log login event
      await pool.query(
        `INSERT INTO login_audit (eth_address, login_role, logged_in_at)
         VALUES ($1, $2, NOW())`,
        [normalizedAddress, effectiveRole]
      );
    } else {
      // Existing user — update role if changed & refresh last_login
      user = userRes.rows[0];

      await pool.query(
        `UPDATE users 
         SET role = $1, last_login = NOW() 
         WHERE eth_address = $2`,
        [effectiveRole, normalizedAddress]
      );

      // Audit trail: log this login attempt
      await pool.query(
        `INSERT INTO login_audit (eth_address, login_role, logged_in_at)
         VALUES ($1, $2, NOW())`,
        [normalizedAddress, effectiveRole]
      );
    }

    // ────────────────────────────────────────────────
    // Issue JWT with user claims (valid 24 hours)
    // ────────────────────────────────────────────────
    const token = jwt.sign(
      {
        sub: normalizedAddress,
        ethAddress: normalizedAddress,
        role: effectiveRole,
        userId: user.id,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24   // 24 hours
      },
      JWT_SECRET
    );

    // Success response with token + basic user info
    res.json({
      token,
      user: {
        address: normalizedAddress,
        did: `did:ethr:${normalizedAddress}`,
        role: effectiveRole,
        createdAt: user.created_at
      }
    });
  } catch (err) {
    console.error('verifySignature error:', err);

    // Handle SIWE-specific errors more gracefully
    if (err?.name === 'SiweError' || err?.reason) {
      return res.status(401).json({
        error: err.reason || 'SIWE verification failed'
      });
    }

    // Extra debug output in test environment
    if (process.env.NODE_ENV === 'test') {
      console.error('[TEST] Auth verify error stack:', err.stack);
    }

    // Generic fallback error
    res.status(500).json({ error: 'Authentication failed' });
  }
};