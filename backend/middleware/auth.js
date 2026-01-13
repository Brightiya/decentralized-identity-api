// backend/src/middleware/auth.js
import jwt from 'jsonwebtoken';
import { ethers } from 'ethers';
import dotenv from 'dotenv';
import {pool} from '../../backend/src/utils/db.js'


dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-dev-key-change-in-prod-please';

/**
 * JWT-based authentication middleware (primary method)
 * 
 * Expects:
 *   Authorization: Bearer <token>
 * 
 * Optionally supports legacy header-based auth (x-did + x-signature)
 * for backward compatibility during migration.
 * 
 * On success, attaches:
 *   req.user = { ethAddress, role, userId, ... }
 */
export const authMiddleware = async (req, res, next) => {
  try {
    // ────────────────────────────────────────────────
    // 1. Preferred: Bearer Token (JWT from SIWE login)
    // ────────────────────────────────────────────────
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];

      try {
        const decoded = jwt.verify(token, JWT_SECRET);

        // Basic sanity check
        if (!decoded.ethAddress || !ethers.isAddress(decoded.ethAddress)) {
          return res.status(401).json({ error: 'Invalid token payload' });
        }

        const normalizedAddress = decoded.ethAddress.toLowerCase();

        // Attach full user context
        req.user = {
          ethAddress: normalizedAddress,
          address: normalizedAddress, // alias for compatibility
          did: `did:ethr:${normalizedAddress}`,
          role: decoded.role || 'USER',
          userId: decoded.userId,
          iat: decoded.iat,
          exp: decoded.exp
        };

        // Optional: Log successful login (audit trail)
        await pool.query(
          `INSERT INTO login_audit (eth_address, login_role, logged_in_at)
           VALUES ($1, $2, NOW())`,
          [normalizedAddress, req.user.role]
        );

        return next();
      } catch (jwtErr) {
        if (jwtErr.name === 'TokenExpiredError') {
          return res.status(401).json({ error: 'Token has expired – please sign in again' });
        }
        if (jwtErr.name === 'JsonWebTokenError') {
          return res.status(401).json({ error: 'Invalid token' });
        }
        throw jwtErr;
      }
    }

    // ────────────────────────────────────────────────
    // 2. Fallback: Legacy header-based auth (x-did + x-signature)
    //    → Keep temporarily during migration, then remove
    // ────────────────────────────────────────────────
    const did = req.headers['x-did'];
    const signature = req.headers['x-signature'];

    if (did && signature) {
      console.warn('⚠️ Using deprecated x-did / x-signature auth – migrate to Bearer JWT');

      // Extract Ethereum address from DID
      const address = did.split(':').pop()?.toLowerCase();
      if (!address || !ethers.isAddress(address)) {
        return res.status(400).json({ error: 'Invalid DID format' });
      }

      // Expected signed message (must match what frontend signs)
      const message = `Authorize GDPR action for ${did}`;

      // Recover signer
      const recovered = ethers.verifyMessage(message, signature);

      if (recovered.toLowerCase() !== address) {
        return res.status(403).json({ error: 'Signature verification failed' });
      }

      // Attach minimal context (no role in legacy mode)
      req.user = {
        ethAddress: address,
        address,
        did,
        role: 'USER' // assume default – upgrade to JWT for roles
      };

      // Optional: Log legacy auth usage
      await pool.query(
        `INSERT INTO login_audit (eth_address, login_role, logged_in_at)
         VALUES ($1, $2, NOW())`,
        [address, 'USER']
      );

      return next();
    }

    // ────────────────────────────────────────────────
    // No valid auth found
    // ────────────────────────────────────────────────
    return res.status(401).json({
      error: 'Authentication required (Bearer token or legacy headers)'
    });

  } catch (err) {
    console.error('❌ Auth middleware error:', err.message || err);
    return res.status(500).json({ error: 'Authentication processing failed' });
  }
};

/**
 * Optional: Role-based access control middleware factory
 * Usage: app.use('/admin/*', requireRole('ADMIN'))
 */
export const requireRole = (requiredRole) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (req.user.role !== requiredRole) {
      return res.status(403).json({
        error: `Insufficient permissions – ${requiredRole} role required`
      });
    }

    next();
  };
};