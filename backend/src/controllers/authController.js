// backend/src/controllers/authController.js
import { ethers } from 'ethers';
import jwt from 'jsonwebtoken';
import { SiweMessage, SiweError } from 'siwe';
import { pool } from '../utils/db.js';
import dotenv from 'dotenv';

dotenv.config();


const JWT_SECRET =
  process.env.JWT_SECRET || 'super-secret-dev-key-change-in-prod-please';

const APP_DOMAIN = process.env.APP_DOMAIN || 'localhost:4200';
const APP_URI = `http://${APP_DOMAIN}/`;
const CHALLENGE_TTL_MINUTES = 5;

const ALLOWED_ROLES = ['USER', 'ADMIN', 'VERIFIER'];

// =====================================
// Helpers
// =====================================
function generateNonce() {
  return ethers.hexlify(ethers.randomBytes(32));
}

function normalizeRole(role) {
  if (!role) return 'USER';
  const upper = String(role).toUpperCase();
  return ALLOWED_ROLES.includes(upper) ? upper : 'USER';
}

// =====================================
// GET /api/auth/challenge
// =====================================
export const getChallenge = async (req, res) => {
  try {
    const { address } = req.query;

    if (!address || !ethers.isAddress(address)) {
      return res.status(400).json({ error: 'Valid Ethereum address required' });
    }

    const checksumAddress = ethers.getAddress(address);
    const normalizedAddress = checksumAddress.toLowerCase();

    const nonce = generateNonce();
    const issuedAt = new Date().toISOString();
    const expirationTime = new Date(
      Date.now() + CHALLENGE_TTL_MINUTES * 60 * 1000
    ).toISOString();

    const siweMessage = new SiweMessage({
      domain: APP_DOMAIN,
      address: checksumAddress,
      statement: 'Sign in to PIMV Identity Vault',
      uri: APP_URI,
      version: '1',
      chainId: 31337,
      nonce,
      issuedAt,
      expirationTime
    });

    await pool.query(
      `INSERT INTO nonces (nonce, address, expires_at)
       VALUES ($1, $2, $3)
       ON CONFLICT (nonce) DO NOTHING`,
      [nonce, normalizedAddress, expirationTime]
    );

    res.json({
      message: siweMessage.prepareMessage(),
      nonce
    });
  } catch (err) {
    console.error('getChallenge error:', err);
    res.status(500).json({ error: 'Failed to generate authentication challenge' });
  }
};
// =====================================
// POST /api/auth/verify
// =====================================
export const verifySignature = async (req, res) => {
  try {
    const { message, signature, requestedRole } = req.body;

    if (!message || !signature) {
      return res
        .status(400)
        .json({ error: 'Both message and signature are required' });
    }

    const siweMessage = new SiweMessage(message);
    const verification = await siweMessage.verify({ signature });
    const fields = verification.data;

    // Validate domain & URI
    if (fields.domain !== APP_DOMAIN || fields.uri !== APP_URI) {
      return res.status(401).json({ error: 'Invalid SIWE domain or URI' });
    }

    let checksumAddress;
    try {
      checksumAddress = ethers.getAddress(fields.address);
    } catch {
      return res.status(400).json({ error: 'Invalid Ethereum address format' });
    }

    const normalizedAddress = checksumAddress.toLowerCase();

    // Nonce validation
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

    await pool.query('DELETE FROM nonces WHERE nonce = $1', [fields.nonce]);

    // =====================================
    // RBAC — Session role follows user selection
    // =====================================
    const userRes = await pool.query(
      'SELECT id, eth_address, role, created_at FROM users WHERE eth_address = $1',
      [normalizedAddress]
    );

    let user;
    let effectiveRole;
    const loginIntent = normalizeRole(requestedRole);

    if (userRes.rowCount === 0) {
      // First login → create with the selected role (or default to USER if invalid)
      effectiveRole = loginIntent;

      const insertRes = await pool.query(
        `INSERT INTO users (eth_address, role, created_at, last_login)
         VALUES ($1, $2, NOW(), NOW())
         RETURNING id, eth_address, role, created_at`,
        [normalizedAddress, effectiveRole]
      );

      user = insertRes.rows[0];
    } else {
      user = userRes.rows[0];

      // For existing users: use the requested role as the session role
      // and update the persistent role in DB to match current choice
      effectiveRole = loginIntent;

      // Update both last_login and the role column
      await pool.query(
        `UPDATE users 
         SET role = $1, last_login = NOW() 
         WHERE eth_address = $2`,
        [effectiveRole, normalizedAddress]
      );
    }

    // =====================================
    // Issue JWT
    // =====================================
    const token = jwt.sign(
      {
        sub: checksumAddress,
        ethAddress: checksumAddress,
        role: effectiveRole,
        userId: user.id,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 60 * 60
      },
      JWT_SECRET
    );

    res.json({
      token,
      user: {
        address: checksumAddress,
        did: `did:ethr:${checksumAddress}`,
        role: effectiveRole,
        createdAt: user.created_at
      }
    });
  } catch (err) {
    console.error('verifySignature error:', err);

    if (err instanceof SiweError) {
      return res.status(401).json({
        error: err.reason || 'SIWE verification failed'
      });
    }

    res.status(500).json({ error: 'Authentication failed' });
  }
};
