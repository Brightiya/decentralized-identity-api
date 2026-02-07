// backend/test/setup.js

import { jest } from "@jest/globals";

// 🚨 MUST be first
process.env.NODE_ENV = "test";

// =========================
// 🧪 MOCK SIWE VERIFY HERE
// =========================
// ────────────────────────────────────────────────
// Force SIWE mock at the very top — before anything else imports siwe
// ────────────────────────────────────────────────
import { SiweMessage as OriginalSiweMessage } from "siwe";

console.log("[TEST SETUP] Applying global SIWE mock (immediate)");

const mockedVerify = async function (options) {
  console.log("[TEST MOCK] SIWE verify() bypassed");
  return {
    success: true,
    data: {
      ...this,
      address: this.address?.toLowerCase(),
      nonce: this.nonce,
      chainId: this.chainId || 31337,
      domain: this.domain,
      uri: this.uri,
      version: this.version || "1",
      statement: this.statement,
      issuedAt: this.issuedAt,
      expirationTime: this.expirationTime,
    },
  };
};

// Apply to prototype immediately
OriginalSiweMessage.prototype.verify = mockedVerify;

// Also patch the constructor so newly created instances get the mock
const PatchedSiweMessage = function (...args) {
  const instance = new OriginalSiweMessage(...args);
  instance.verify = mockedVerify;
  return instance;
};

// Replace the exported class
jest.mock("siwe", () => ({
  SiweMessage: PatchedSiweMessage,
  SiweError: OriginalSiweMessage.SiweError, // preserve error class if needed
}));

console.log("[TEST SETUP] SIWE mock applied (prototype + constructor patched)");

// Now it is SAFE to import DB
import { pool } from "../src/utils/db.js";

console.log(
  "[TEST SETUP] NODE_ENV:",
  process.env.NODE_ENV
);
console.log(
  "[TEST SETUP] JWT_SECRET loaded:",
  !!process.env.JWT_SECRET
);


// =========================

afterAll(async () => {
  console.log("Cleaning up test database...");

  try {
    await pool.query(`
      TRUNCATE TABLE 
        users, 
        nonces, 
        consents, 
        disclosures, 
        login_audit 
      RESTART IDENTITY CASCADE;
    `);

    console.log("Test DB cleaned up successfully.");
  } catch (err) {
    console.error("Failed to clean up test DB:", err.stack || err);
  } finally {
    try {
      await pool.end();
      console.log("PostgreSQL connection pool closed.");
    } catch (closeErr) {
      console.error("Error closing pool:", closeErr);
    }
  }

  await new Promise(resolve => setTimeout(resolve, 100));
});
