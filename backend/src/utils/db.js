// backend/src/utils/db.js
import pg from "pg";

// Use a separate test DB if NODE_ENV=test (recommended for safety)
const connectionString = process.env.DATABASE_URL;
const url = process.env.DATABASE_URL ?? "";

if (!connectionString) {
  throw new Error("DATABASE_URL is not set");
}

if (process.env.NODE_ENV === "test" && !url.includes("_test")) {
  throw new Error("🚨 Tests refusing to run on non-test database");
}

if (process.env.NODE_ENV !== "test" && url.includes("_test")) {
  throw new Error("🚨 Backend refusing to run on test database");
}


export const pool = new pg.Pool({
  connectionString,
  max: 20,                    // Max connections (adjust if needed)
  idleTimeoutMillis: 30000,   // Close idle connections after 30s
  connectionTimeoutMillis: 2000,
});

pool.on("connect", () => {
  console.log("🟢 PostgreSQL connected");
});

(async () => {
  const result = await pool.query("SELECT current_database()");
  console.log("🧪 Connected to database:", result.rows[0].current_database);
})();


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