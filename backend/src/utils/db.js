// backend/src/utils/db.js
// backend/src/utils/db.js
import pg from "pg";

const connectionString = process.env.DATABASE_URL;

// 1. Log the status instead of throwing immediately at top-level
if (!connectionString) {
  console.error("❌ DATABASE_URL is undefined. Check Fly.io secrets.");
}

// 2. Add SSL configuration (Required for Fly.io Postgres)
export const pool = new pg.Pool({
  connectionString,
  ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000, // Increased timeout for cold starts
});

// 3. Move the connectivity test inside a handled block
(async () => {
  if (!connectionString) return;
  try {
    const result = await pool.query("SELECT current_database()");
    console.log("🧪 Connected to database:", result.rows[0].current_database);
  } catch (err) {
    console.error("❌ Database connectivity test failed:", err.message);
  }
})();

export default pool;


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