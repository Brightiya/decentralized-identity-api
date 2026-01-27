import { jest } from '@jest/globals';
import { config } from 'dotenv';
import { resolve } from 'path';
import { pool } from "../src/utils/db.js";

// Load .env BEFORE anything else
config({ path: resolve(process.cwd(), '.env'), override: true });

console.log('[TEST SETUP] JWT_SECRET loaded:', !!process.env.JWT_SECRET);
console.log('[TEST SETUP] JWT_SECRET value (first 10 chars):', process.env.JWT_SECRET?.substring(0, 10) || 'MISSING');


// =========================
// 🧪 MOCK SIWE VERIFY HERE
// =========================
jest.mock('siwe', () => {
  const originalModule = jest.requireActual('siwe');
  return {
    ...originalModule,
    SiweMessage: class extends originalModule.SiweMessage {
      async verify() {
        console.log('[TEST MOCK] SIWE verify() bypassed');
        return { data: this }; // mimic successful verification
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
