// backend/test/setup.js

import { jest } from "@jest/globals";

// 🚨 MUST be first
process.env.NODE_ENV = "test";

// Load envs from the single source of truth
//await import("../src/config/env.js");

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
// 🧪 MOCK SIWE VERIFY HERE
// =========================
jest.mock("siwe", () => {
  const originalModule = jest.requireActual("siwe");
  return {
    ...originalModule,
    SiweMessage: class extends originalModule.SiweMessage {
      async verify() {
        console.log("[TEST MOCK] SIWE verify() bypassed");
        return { data: this };
      }
    }
  };
});
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
