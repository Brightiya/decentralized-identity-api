import jwt from 'jsonwebtoken'; // Library for handling JWT tokens
import { ethers } from 'ethers'; // Ethereum utilities (address validation, signature verification)
import {pool} from '../../backend/src/utils/db.js' // Database connection pool for logging/auditing


// Secret used to verify JWT tokens (fallback for development)
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

    // Check if Authorization header exists and follows Bearer format
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1]; // Extract token

      try {
        // Verify and decode JWT token
        const decoded = jwt.verify(token, JWT_SECRET);

        // Basic sanity check: ensure Ethereum address exists and is valid
        if (!decoded.ethAddress || !ethers.isAddress(decoded.ethAddress)) {
          return res.status(401).json({ error: 'Invalid token payload' });
        }

        // Normalize Ethereum address to lowercase
        const normalizedAddress = decoded.ethAddress.toLowerCase();

        // Attach full user context to request
        req.user = {
          ethAddress: normalizedAddress,
          address: normalizedAddress, // alias for compatibility
          did: `did:ethr:${normalizedAddress}`, // Construct DID
          role: decoded.role || 'USER', // Default role if not provided
          userId: decoded.userId, // Internal user ID
          iat: decoded.iat, // Token issued-at timestamp
          exp: decoded.exp // Token expiry timestamp
        };

        // Optional: Log successful login (audit trail)
        await pool.query(
          `INSERT INTO login_audit (eth_address, login_role, logged_in_at)
           VALUES ($1, $2, NOW())`,
          [normalizedAddress, req.user.role]
        );

        return next(); // Continue to next middleware/route
      } catch (jwtErr) {
        // Handle specific JWT errors for better client feedback
        if (jwtErr.name === 'TokenExpiredError') {
          return res.status(401).json({ error: 'Token has expired – please sign in again' });
        }
        if (jwtErr.name === 'JsonWebTokenError') {
          return res.status(401).json({ error: 'Invalid token' });
        }
        throw jwtErr; // Unexpected JWT error → handled by outer catch
      }
    }

    // ────────────────────────────────────────────────
    // 2. Fallback: Legacy header-based auth (x-did + x-signature)
    //    → Keep temporarily during migration, then remove
    // ────────────────────────────────────────────────
    const did = req.headers['x-did']; // DID provided by client
    const signature = req.headers['x-signature']; // Signature provided by client

    // If legacy headers are present, attempt fallback authentication
    if (did && signature) {
      console.warn('⚠️ Using deprecated x-did / x-signature auth – migrate to Bearer JWT');

      // Extract Ethereum address from DID (last segment)
      const address = did.split(':').pop()?.toLowerCase();

      // Validate extracted address
      if (!address || !ethers.isAddress(address)) {
        return res.status(400).json({ error: 'Invalid DID format' });
      }

      // Expected signed message (must match frontend signing logic)
      const message = `Authorize GDPR action for ${did}`;

      // Recover Ethereum address from signature
      const recovered = ethers.verifyMessage(message, signature);

      // Ensure recovered address matches expected address
      if (recovered.toLowerCase() !== address) {
        return res.status(403).json({ error: 'Signature verification failed' });
      }

      // Attach minimal user context (no roles in legacy mode)
      req.user = {
        ethAddress: address,
        address,
        did,
        role: 'USER' // Default role (no RBAC in legacy mode)
      };

      // Optional: Log legacy authentication usage
      await pool.query(
        `INSERT INTO login_audit (eth_address, login_role, logged_in_at)
         VALUES ($1, $2, NOW())`,
        [address, 'USER']
      );

      return next(); // Continue request
    }

    // ────────────────────────────────────────────────
    // No valid authentication provided
    // ────────────────────────────────────────────────
    return res.status(401).json({
      error: 'Authentication required (Bearer token or legacy headers)'
    });

  } catch (err) {
    // Log unexpected internal errors
    console.error('❌ Auth middleware error:', err.message || err);

    // Return generic error to client
    return res.status(500).json({ error: 'Authentication processing failed' });
  }
};

/**
 * Optional: Role-based access control middleware factory
 * Usage: app.use('/admin/*', requireRole('ADMIN'))
 */
export const requireRole = (requiredRole) => {
  return (req, res, next) => {
    // Ensure user is authenticated
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Check if user has required role
    if (req.user.role !== requiredRole) {
      return res.status(403).json({
        error: `Insufficient permissions – ${requiredRole} role required`
      });
    }

    // Allow access
    next();
  };
};