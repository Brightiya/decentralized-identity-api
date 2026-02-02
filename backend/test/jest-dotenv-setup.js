// backend/test/jest-dotenv-setup.js
process.env.NODE_ENV = "test";
import "../src/config/env.js";


process.env.PINATA_JWT = process.env.PINATA_JWT || "TEST_PINATA_JWT";

// backend/test/setup.js (or add to existing setup file)

// Silence Pinata shared-key warnings during tests
const originalWarn = console.warn;
console.warn = function (...args) {
  // Suppress only the specific Pinata security warnings
  if (
    typeof args[0] === 'string' &&
    args[0].includes('[SECURITY] Using shared Pinata JWT')
  ) {
    return; // skip logging
  }
  // Let all other warnings through
  originalWarn.apply(console, args);
};


console.log("[Jest EARLY SETUP] NODE_ENV:", process.env.NODE_ENV);
console.log("[Jest EARLY SETUP] DATABASE_URL:", process.env.DATABASE_URL);
console.log("[Jest EARLY SETUP] PRIVATE_KEY exists?", !!process.env.PRIVATE_KEY);
console.log("[Jest EARLY SETUP] HYBRID_MODE:", process.env.HYBRID_MODE || "NOT SET");