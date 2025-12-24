export function gdprConsentMiddleware(req, res, next) {
  // Placeholder for PostgreSQL-backed consent check
  // Later: ConsentLog lookup

  const consentGranted = true; // temporary

  if (!consentGranted) {
    return res.status(403).json({
      error: "No valid consent for requested context"
    });
  }

  next();
}
