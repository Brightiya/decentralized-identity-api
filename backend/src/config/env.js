// backend/src/config/env.js
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

// ESM-safe __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Always resolve from backend/
const envFile =
  process.env.NODE_ENV === "test"
    ? ".env.test"
    : ".env";

const envPath = path.resolve(__dirname, "..", "..", envFile);

dotenv.config({ path: envPath });

console.log(`🌱 Loaded env from ${envPath}`);

if (process.env.NODE_ENV === "test") {
  console.log("🧪 Test environment active");
}
