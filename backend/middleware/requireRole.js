import jwt from 'jsonwebtoken'; // Library for signing and verifying JSON Web Tokens

// Secret used to verify JWT signatures (fallback for development)
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
  // Ensure at least one role is provided when middleware is created
  if (!allowedRoles.length) {
    throw new Error('requireRole must be called with at least one role');
  }

  // Return actual Express middleware function
  return (req, res, next) => {
    // Extract Authorization header from request
    const authHeader = req.headers.authorization;

    // Validate presence and format of Bearer token
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'Authentication required (Bearer token)'
      });
    }

    try {
      // Extract token from header ("Bearer <token>")
      const token = authHeader.split(' ')[1];

      // Verify token signature and decode payload
      const payload = jwt.verify(token, JWT_SECRET);

      // Basic token payload validation
      if (!payload.ethAddress || !payload.role) {
        return res.status(403).json({
          error: 'Invalid token payload (missing ethAddress or role)'
        });
      }

      // Extract user role and normalize Ethereum address
      const userRole = payload.role;
      const normalizedAddress = payload.ethAddress.toLowerCase();

      // Role check: ensure user role is allowed
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
        id: payload.userId, // Internal user ID (if present in token)
        address: normalizedAddress, // Normalized Ethereum address
        ethAddress: normalizedAddress, // Alias for compatibility
        did: `did:ethr:${normalizedAddress}`, // Construct DID from Ethereum address
        role: userRole // User role (e.g., USER, ADMIN, VERIFIER)
      };

      // Proceed to next middleware or route handler
      next();
    } catch (err) {
      // Log JWT verification errors
      console.error('JWT validation failed:', err.message || err);

      // Handle expired token separately for better UX
      if (err.name === 'TokenExpiredError') {
        return res.status(401).json({ error: 'Token has expired – please sign in again' });
      }

      // Generic invalid token response
      return res.status(401).json({ error: 'Invalid or expired token' });
    }
  };
};