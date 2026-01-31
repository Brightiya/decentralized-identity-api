// backend/test/global-setup.js
import dotenv from "dotenv";
import { JsonRpcProvider } from "ethers";

export default async function globalSetup() {
  // ─────────────────────────────────────────────
  // Load test environment variables
  // ─────────────────────────────────────────────
  dotenv.config({
    path: "./backend/.env.test",
    override: true,
  });

  // Force HYBRID MODE in tests
  process.env.NODE_ENV = "test";
  process.env.HYBRID_MODE = "true";

  console.log(
    "[GLOBAL SETUP] Loaded .env.test → HYBRID_MODE:",
    process.env.HYBRID_MODE
  );

  // ─────────────────────────────────────────────
  // Register GLOBAL mocked ethers provider
  // (must exist BEFORE any controller imports)
  // ─────────────────────────────────────────────
  const mockProvider = new JsonRpcProvider("http://localhost:0");

  // Disable all real network behavior
  mockProvider.detectNetwork = async () => ({
    name: "test",
    chainId: 1337,
  });

  mockProvider.getNetwork = async () => ({
    name: "test",
    chainId: 1337,
  });

  mockProvider.send = async () => null;
  mockProvider.call = async () => "0x";
  mockProvider.getBlockNumber = async () => 0;

  // Make provider globally available
  global.__MOCK_PROVIDER__ = mockProvider;

  console.log("[GLOBAL SETUP] ✅ Mock ethers provider registered");
}
