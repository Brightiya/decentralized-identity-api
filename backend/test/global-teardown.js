export default async function globalTeardown() {
  const provider = global.__MOCK_PROVIDER__;

  if (provider) {
    // ethers v6 cleanup
    if (typeof provider.destroy === "function") {
      await provider.destroy();
    }
  }

  console.log("[GLOBAL TEARDOWN] 🧹 Mock ethers provider cleaned up");
}
