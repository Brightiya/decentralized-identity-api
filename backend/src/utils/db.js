// backend/src/utils/db.js
import pg from "pg";
import dotenv from "dotenv";

dotenv.config();

// Use a separate test DB if NODE_ENV=test (recommended for safety)
const connectionString = process.env.NODE_ENV === "test"
  ? process.env.DATABASE_URL_TEST || process.env.DATABASE_URL
  : process.env.DATABASE_URL;

export const pool = new pg.Pool({
  connectionString,
  max: 20,                    // Max connections (adjust if needed)
  idleTimeoutMillis: 30000,   // Close idle connections after 30s
  connectionTimeoutMillis: 2000,
});

pool.on("connect", () => {
  console.log("🟢 PostgreSQL connected");
});

pool.on("error", (err, client) => {
  console.error("❌ PostgreSQL pool error:", err.stack);
});

// Optional: Graceful shutdown for tests/CI
process.on("SIGTERM", async () => {
  console.log("Shutting down PostgreSQL pool...");
  await pool.end();
  process.exit(0);
});

process.on("SIGINT", async () => {
  console.log("Shutting down PostgreSQL pool...");
  await pool.end();
  process.exit(0);
});