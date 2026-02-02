// backend/src/middleware/requireRole.js
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-dev-key-change-in-prod-please';

/**
 * Role-based access control middleware factory
 * 
 * Usage examples:
 *   app.use('/admin/*', requireRole('ADMIN'))
 *   app.use('/verifier/*', requireRole('VERIFIER'))
 *   app.use('/protected/*', requireRole('USER', 'ADMIN', 'VERIFIER'))
 * 
 * On success: attaches req.user with normalized data
 * On failure: returns 401/403 with clear error
 */
export const requireRole = (...allowedRoles) => {
  if (!allowedRoles.length) {
    throw new Error('requireRole must be called with at least one role');
  }

  return (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'Authentication required (Bearer token)'
      });
    }

    try {
      const token = authHeader.split(' ')[1];
      const payload = jwt.verify(token, JWT_SECRET);

      // Basic token payload validation
      if (!payload.ethAddress || !payload.role) {
        return res.status(403).json({
          error: 'Invalid token payload (missing ethAddress or role)'
        });
      }

      const userRole = payload.role;
      const normalizedAddress = payload.ethAddress.toLowerCase();

      // Role check
      if (!allowedRoles.includes(userRole)) {
        console.warn(`Role check failed: user ${normalizedAddress} has ${userRole}, required: ${allowedRoles.join(', ')}`);

        return res.status(403).json({
          error: 'Insufficient permissions',
          requiredRoles: allowedRoles,
          yourRole: userRole
        });
      }

      // Attach normalized user context for downstream use
      req.user = {
        id: payload.userId,
        address: normalizedAddress,
        ethAddress: normalizedAddress,
        did: `did:ethr:${normalizedAddress}`,
        role: userRole
      };

      next();
    } catch (err) {
      console.error('JWT validation failed:', err.message || err);

      if (err.name === 'TokenExpiredError') {
        return res.status(401).json({ error: 'Token has expired – please sign in again' });
      }

      return res.status(401).json({ error: 'Invalid or expired token' });
    }
  };
};