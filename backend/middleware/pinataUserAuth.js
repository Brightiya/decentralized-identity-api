export const pinataUserAuth = (req, res, next) => {
  // Extract Pinata JWT from custom request header OR fallback to server environment variable
  req.pinataJwt = req.headers['x-pinata-user-jwt'] || process.env.PINATA_JWT;

  // If no JWT is available at all, return server configuration error
  if (!req.pinataJwt) {
    return res.status(500).json({ error: "Pinata JWT configuration missing" });
  }

  // Optional security warning in production:
  // If user did NOT provide their own JWT and system is using shared backend JWT
  if (!req.headers['x-pinata-user-jwt'] && process.env.NODE_ENV !== 'development') {
    console.warn('[SECURITY] Using shared Pinata JWT - per-user recommended');
  }

  // Proceed to next middleware or route handler
  next();
};