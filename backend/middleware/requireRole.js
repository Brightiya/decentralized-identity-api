// backend/src/middleware/requireRole.js
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET;

export const requireRole = (...allowedRoles) => {
  if (!allowedRoles.length) {
    throw new Error('requireRole must be called with at least one role');
  }

  return (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'Authentication required',
      });
    }

    try {
      const token = authHeader.split(' ')[1];
      const payload = jwt.verify(token, JWT_SECRET);

      const userRole = payload.role;

      if (!userRole) {
        return res.status(403).json({
          error: 'Role missing from token',
        });
      }

      if (!allowedRoles.includes(userRole)) {
        return res.status(403).json({
          error: 'Insufficient permissions',
          required: allowedRoles,
          actual: userRole,
        });
      }

      // Attach user context
      req.user = {
        id: payload.userId,
        address: payload.ethAddress,
        role: userRole,
      };

      next();
    } catch (err) {
      console.error('JWT validation failed:', err);

      return res.status(401).json({
        error: 'Invalid or expired token',
      });
    }
  };
};
