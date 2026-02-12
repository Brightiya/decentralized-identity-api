import {ethers} from "ethers";

let provider;

/**
 * Creates a real Ethereum JSON-RPC provider
 * Used ONLY in non-test, non-hybrid mode
 */
export function createProvider() {
  const rpcUrl =
    process.env.PROVIDER_URL;

  if (!rpcUrl) {
    throw new Error("❌ Missing PROVIDER_URL for Ethereum provider");
  }

  const p = new ethers.JsonRpcProvider(rpcUrl, undefined, {
    polling: false,            // 🚫 no background polling
    staticNetwork: true,       // 🚫 no network auto-detect
  });

  return p;
}

/**
 * Unified provider accessor
 */
export function getProvider() {
  // 🧪 Jest → mocked provider
  if (process.env.NODE_ENV === "test") {
    if (!global.__MOCK_PROVIDER__) {
      throw new Error("❌ Mock provider not registered");
    }
    return global.__MOCK_PROVIDER__;
  }

  // 🚫 Hybrid mode → forbid real chain access
  if (process.env.HYBRID_MODE === "true") {
    throw new Error("Provider access disabled in HYBRID_MODE");
  }

  if (!provider) {
    provider = createProvider();
  }

  return provider;
}
