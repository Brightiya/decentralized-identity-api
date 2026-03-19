import "../../src/config/env.js"; // Load environment variables (e.g., DATABASE_URL)
import pg from "pg"; // PostgreSQL client library

// Retrieve database connection string from environment
const connectionString = process.env.DATABASE_URL;

// 1. Log a warning if DATABASE_URL is missing (do not crash immediately)
if (!connectionString) {
  console.error("❌ DATABASE_URL is undefined. Check Fly.io secrets.");
}

// 2. Create PostgreSQL connection pool
export const pool = new pg.Pool({
  connectionString,

  // Enable SSL only in production (required for managed services like Fly.io)
  ssl:
    process.env.NODE_ENV === "production"
      ? { rejectUnauthorized: false } // Allow self-signed certs (common in cloud DBs)
      : false,

  max: 20, // Maximum number of concurrent connections in the pool
  idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
  connectionTimeoutMillis: 5000, // Timeout for establishing new connections (important for cold starts)
});

// 3. Test database connectivity at startup (non-blocking)
(async () => {
  // Skip test if no connection string is provided
  if (!connectionString) return;

  try {
    // Simple query to verify connection
    const result = await pool.query("SELECT current_database()");
    console.log("🧪 Connected to database:", result.rows[0].current_database);
  } catch (err) {
    // Log failure but do not crash the app
    console.error("❌ Database connectivity test failed:", err.message);
  }
})();

// Export pool as default for reuse across the application
export default pool;

// Handle unexpected errors on idle clients in the pool
pool.on("error", (err, client) => {
  console.error("❌ PostgreSQL pool error:", err.stack);
});

// Optional: Graceful shutdown for production, tests, or CI environments
process.on("SIGTERM", async () => {
  console.log("Shutting down PostgreSQL pool...");
  await pool.end(); // Close all connections cleanly
  process.exit(0);
});

process.on("SIGINT", async () => {
  console.log("Shutting down PostgreSQL pool...");
  await pool.end(); // Close all connections cleanly
  process.exit(0);
});