// backend/test/global-setup.js

//await import("../src/config/env.js");
import {ethers} from "ethers";


export default async function globalSetup() {
 
  // Force HYBRID MODE in tests
  process.env.HYBRID_MODE = "true";
  process.env.NODE_ENV = "test";
  console.log(
    "[GLOBAL SETUP] Loaded .env.test → HYBRID_MODE:",
    process.env.HYBRID_MODE
  );

  // ─────────────────────────────────────────────
  // Register GLOBAL mocked ethers provider
  // (must exist BEFORE any controller imports)
  // ─────────────────────────────────────────────
  const mockProvider = new ethers.JsonRpcProvider("http://localhost:0");

 
  mockProvider._start = () => {};

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
