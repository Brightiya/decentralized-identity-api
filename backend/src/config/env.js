import dotenv from "dotenv"; 
// Imports dotenv to load environment variables from a .env file

import path from "path"; 
// Imports path module to work with file and directory paths

import { fileURLToPath } from "url"; 
// Imports utility to convert ES module URLs to file paths

const __filename = fileURLToPath(import.meta.url);
// Converts the current module's URL to a file path (ESM equivalent of __filename)

const __dirname = path.dirname(__filename);
// Gets the directory name of the current file (ESM equivalent of __dirname)

// Only load from .env file if NOT in production
if (process.env.NODE_ENV !== "production") {
  const envFile = process.env.NODE_ENV === "test" ? ".env.test" : ".env";
  // Chooses .env.test if in test mode, otherwise defaults to .env

  const envPath = path.resolve(__dirname, "..", "..", envFile);
  // Resolves the absolute path to the environment file (two levels up)

  dotenv.config({ path: envPath });
  // Loads environment variables from the specified file into process.env

  console.log(`🌱 Loaded env from ${envPath}`);
  // Logs which environment file was loaded
} else {
  console.log("🚀 Production mode: Using system environment variables");
  // In production, relies on system-provided environment variables instead of .env files
}

if (process.env.NODE_ENV === "test") {
  console.log("🧪 Test environment active");
  // Logs when the application is running in test mode
}