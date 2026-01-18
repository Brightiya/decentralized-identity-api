// backend/src/middleware/pinataUserAuth.js
export const pinataUserAuth = (req, res, next) => {
  req.pinataJwt = req.headers['x-pinata-user-jwt'] || process.env.PINATA_JWT;

  if (!req.pinataJwt) {
    return res.status(500).json({ error: "Pinata JWT configuration missing" });
  }

  // Optional warning in prod
  if (!req.headers['x-pinata-user-jwt'] && process.env.NODE_ENV !== 'development') {
    console.warn('[SECURITY] Using shared Pinata JWT - per-user recommended');
  }

  next();
};