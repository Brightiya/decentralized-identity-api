import { JsonRpcProvider } from "ethers";

let provider; // Cached provider instance (singleton pattern)

/**
 * Creates a real Ethereum JSON-RPC provider
 * Used ONLY in non-test, non-hybrid mode
 */
export function createProvider() {
  // Read RPC URL from environment variables
  const rpcUrl =
    process.env.PROVIDER_URL;

  // Ensure RPC URL is provided
  if (!rpcUrl) {
    throw new Error("❌ Missing PROVIDER_URL for Ethereum provider");
  }

  // Create a new JSON-RPC provider instance
  const p = new JsonRpcProvider(rpcUrl, undefined, {
    polling: false,            // 🚫 Disable background polling for efficiency
    staticNetwork: true,       // 🚫 Prevent automatic network detection
  });

  return p; // Return configured provider
}

/**
 * Unified provider accessor
 */
export function getProvider() {
  // 🧪 TEST ENVIRONMENT
  // Use mocked provider instead of real blockchain connection
  if (process.env.NODE_ENV === "test") {
    if (!global.__MOCK_PROVIDER__) {
      throw new Error("❌ Mock provider not registered");
    }
    return global.__MOCK_PROVIDER__;
  }

  // 🚫 HYBRID MODE
  // In hybrid mode, frontend signs transactions → backend should NOT access blockchain
  if (process.env.HYBRID_MODE === "true") {
    throw new Error("Provider access disabled in HYBRID_MODE");
  }

  // Lazy initialization: create provider only once
  if (!provider) {
    provider = createProvider();
  }

  return provider; // Return cached provider instance
}