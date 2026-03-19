// Utility to wrap async route handlers and forward errors to Express error middleware
export const asyncHandler = (fn) => (req, res, next) => {
  // Execute async function and catch any rejected promises
  Promise.resolve(fn(req, res, next)).catch(next);
};