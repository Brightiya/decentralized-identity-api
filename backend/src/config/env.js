// backend/src/config/env.js
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Only load from .env file if NOT in production
if (process.env.NODE_ENV !== "production") {
  const envFile = process.env.NODE_ENV === "test" ? ".env.test" : ".env";
  const envPath = path.resolve(__dirname, "..", "..", envFile);
  
  dotenv.config({ path: envPath });
  console.log(`🌱 Loaded env from ${envPath}`);
} else {
  console.log("🚀 Production mode: Using system environment variables");
}

if (process.env.NODE_ENV === "test") {
  console.log("🧪 Test environment active");
}
