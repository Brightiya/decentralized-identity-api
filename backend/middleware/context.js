/**
 * Context middleware
 *
 * Supports:
 * - POST /vc/issue        → context from req.body.context
 * - GET  /profile/:addr  → context from req.query.context
 *
 * Fallback:
 * - defaults to "personal"
 */
export function contextMiddleware(req, res, next) {
  let context = null;

  // 1️⃣ Prefer explicit query context (GET requests)
  if (req.query && req.query.context) {
    context = req.query.context;
  }

  // 2️⃣ Fallback to body context (POST /vc/issue)
  if (!context && req.body && req.body.context) {
    context = req.body.context;
  }

  // 3️⃣ Final fallback (SAFE DEFAULT)
  if (!context) {
    context = "personal";
  }

  req.context = context;

  next();
}
