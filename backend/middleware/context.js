/**
 * Context middleware (Option B-1 + hardened sanitation)
 *
 * Protects against:
 *  - control characters
 *  - null byte injection
 *  - SQL-style comment/control tokens
 *  - excessive length
 *
 * Does NOT:
 *  - restrict valid custom contexts
 *  - remap unknown values
 *  - enforce static enum
 */

export function contextMiddleware(req, res, next) {
  let context = null;

  // Explicit ?context
  if (req.query?.context) {
    context = req.query.context.trim();
  }

  // Fallback to body { context }
  if (!context && req.body?.context) {
    context = req.body.context.trim();
  }

  // Service-layer default
  if (!context) {
    context = 'profile';
  }

  // Normalize
  context = context.toLowerCase();

  // ----------- HARDENING LAYER -----------------

  // 1. Strip NULL bytes (classic injection primitive)
  context = context.replace(/\0/g, '');

  // 2. Strip control characters except newline/tab if desired
  context = context.replace(/[\u0000-\u001F\u007F]/g, '');

  // 3. Strip SQL comment/control tokens
  context = context.replace(/(--|;|\/\*|\*\/)/g, '');

  // 4. Enforce max length (prevents giant payload attacks)
  if (context.length > 255) {
    context = context.substring(0, 255);
  }

  // -------------------------------------------------

  req.context = context;
  return next();
}
