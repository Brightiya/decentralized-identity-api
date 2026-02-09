// backend/src/utils/contract-gsn.js
import { ethers } from "ethers";
import Web3 from "web3";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { RelayProvider } from "@opengsn/provider";

// ────────────────────────────────────────────────
// GSN Configuration
// ────────────────────────────────────────────────
const GSN_CONFIG = {
  enabled: process.env.GSN_ENABLED === "true",
  forwarderAddress: process.env.GSN_FORWARDER_ADDRESS,
  paymasterAddress: process.env.GSN_PAYMASTER_ADDRESS,
  registryAddress: process.env.IDENTITY_REGISTRY_GSN_ADDRESS,
  chainId: parseInt(process.env.CHAIN_ID) || 84532,
  gasLimit: "1000000",
  maxFeePerGas: "10000000000",
  maxPriorityFeePerGas: "1000000000",
};

let _gsnProvider = null;
let _regularProvider = null;

// ────────────────────────────────────────────────
// Helper Functions
// ────────────────────────────────────────────────
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function getContractABI() {
  const contractPath = path.resolve(__dirname, "../contractData.json");
  try {
    const contractData = JSON.parse(fs.readFileSync(contractPath, "utf8"));
    return contractData.abi;
  } catch (err) {
    console.error("Failed to load contractData.json:", err);
    throw err;
  }
}

function getRegularProvider() {
  if (!_regularProvider) {
    const rpcUrl = process.env.SEPOLIA_RPC_URL || process.env.PROVIDER_URL;
    if (!rpcUrl) {
      throw new Error("RPC URL not configured for GSN");
    }
    _regularProvider = new ethers.providers.JsonRpcProvider(rpcUrl);
  }
  return _regularProvider;
}

export function isGSNEnabled() {
  return GSN_CONFIG.enabled;
}

export function getGSNConfigForFrontend() {
  if (!isGSNEnabled()) {
    return { enabled: false };
  }

  return {
    enabled: true,
    chainId: GSN_CONFIG.chainId,
    forwarderAddress: GSN_CONFIG.forwarderAddress,
    paymasterAddress: GSN_CONFIG.paymasterAddress,
    registryAddress: GSN_CONFIG.registryAddress,
    rpcUrl: process.env.SEPOLIA_RPC_URL || process.env.PROVIDER_URL,
    domain: {
      name: process.env.APP_DOMAIN || "IdentityRegistry",
      version: "1",
      chainId: GSN_CONFIG.chainId,
      verifyingContract: GSN_CONFIG.registryAddress,
    },
  };
}

// ────────────────────────────────────────────────
// GSN Provider (ethers v5 correct)
// ────────────────────────────────────────────────
export async function getGSNProvider() {
  if (!isGSNEnabled()) {
    throw new Error("GSN is not enabled. Set GSN_ENABLED=true in .env");
  }

  if (_gsnProvider) return _gsnProvider;

  console.log("🔧 Initializing GSN provider...");

  const rpcUrl = process.env.SEPOLIA_RPC_URL || process.env.PROVIDER_URL;
  if (!rpcUrl) {
    throw new Error("RPC URL not configured for GSN");
  }

  // GSN REQUIRES a Web3 provider
  const web3 = new Web3(rpcUrl);

  const gsnConfig = {
    paymasterAddress: GSN_CONFIG.paymasterAddress,
    forwarderAddress: GSN_CONFIG.forwarderAddress,
    loggerConfiguration: { logLevel: "debug" },
    relayLookupWindowBlocks: 1000000,
    maxRelayNonceGap: 10,
  };

  const relayProvider = await RelayProvider.newProvider({
    provider: web3.currentProvider,
    config: gsnConfig,
  }).init();

  // ethers v5 wrapper
  _gsnProvider = new ethers.providers.Web3Provider(relayProvider);

  console.log("✅ GSN provider initialized");
  return _gsnProvider;
}

// ────────────────────────────────────────────────
// Contracts
// ────────────────────────────────────────────────
export async function getGSNContract(userAddress = null) {
  if (!isGSNEnabled()) {
    throw new Error("GSN is not enabled");
  }

  if (!userAddress) {
    return new ethers.Contract(
      GSN_CONFIG.registryAddress,
      getContractABI(),
      getRegularProvider()
    );
  }

  const gsnProvider = await getGSNProvider();
  const signer = gsnProvider.getSigner(userAddress);

  return new ethers.Contract(
    GSN_CONFIG.registryAddress,
    getContractABI(),
    signer
  );
}

// ────────────────────────────────────────────────
// Whitelist check (ethers v5 FIX)
// ────────────────────────────────────────────────
export async function isUserWhitelistedForGSN(address) {
  if (!isGSNEnabled()) return false;

  try {
    const contract = await getGSNContract();
    return await contract.isWhitelisted(address);
  } catch (error) {
    console.error("Error checking GSN whitelist:", error.message);
    return false;
  }
}

// ────────────────────────────────────────────────
// Prepare GSN transaction data (UNCHANGED)
// ────────────────────────────────────────────────
export async function prepareGSNTransaction(methodName, ...args) {
  if (!isGSNEnabled()) {
    throw new Error("GSN is not enabled");
  }

  const iface = new ethers.utils.Interface(getContractABI());
  const data = iface.encodeFunctionData(methodName, args);

  return {
    to: GSN_CONFIG.registryAddress,
    data,
    chainId: GSN_CONFIG.chainId,
    gasLimit: GSN_CONFIG.gasLimit,
    value: "0",
    useGSN: true,
    paymasterAddress: GSN_CONFIG.paymasterAddress,
    forwarderAddress: GSN_CONFIG.forwarderAddress,
    description: `GSN: ${methodName}`,
    timestamp: new Date().toISOString(),
  };
}

// ────────────────────────────────────────────────
// Convenience wrappers (PRESERVED)
// ────────────────────────────────────────────────
export async function prepareGSNCreateProfile(subjectAddress) {
  return prepareGSNTransaction("createProfile", subjectAddress);
}

export async function prepareGSNSetClaim(
  subjectAddress,
  claimIdBytes32,
  claimHash
) {
  return prepareGSNTransaction(
    "setClaim",
    subjectAddress,
    claimIdBytes32,
    claimHash
  );
}

export async function prepareGSNSetProfileCID(subjectAddress, cid) {
  return prepareGSNTransaction("setProfileCID", subjectAddress, cid);
}

export async function prepareGSNSetVerifiableCredential(
  subjectAddress,
  credentialHash,
  issuerSignature,
  expirationDate
) {
  return prepareGSNTransaction(
    "setVerifiableCredential",
    subjectAddress,
    credentialHash,
    issuerSignature,
    expirationDate
  );
}

// ────────────────────────────────────────────────
// Health & Test functions
// ────────────────────────────────────────────────
export function getGSNHealth() {
  return {
    gsnEnabled: isGSNEnabled(),
    config: getGSNConfigForFrontend(),
    contracts: {
      registry: GSN_CONFIG.registryAddress,
      forwarder: GSN_CONFIG.forwarderAddress,
      paymaster: GSN_CONFIG.paymasterAddress,
    },
    network: {
      chainId: GSN_CONFIG.chainId,
      name: "base-sepolia",
    },
    status: isGSNEnabled() ? "READY" : "DISABLED",
  };
}

export async function testGSNConnectivity() {
  if (!isGSNEnabled()) {
    return { success: false, message: "GSN not enabled" };
  }

  try {
    const provider = getRegularProvider();
    const blockNumber = await provider.getBlockNumber();

    const contract = await getGSNContract();
    const contractAddress = contract.address;

    const iface = new ethers.utils.Interface(getContractABI());
    const contractMethods = Object.keys(iface.functions);

    let gsnProviderStatus = "READY";
    try {
      await getGSNProvider();
    } catch (error) {
      gsnProviderStatus = `ERROR: ${error.message}`;
    }

    return {
      success: true,
      message: "GSN connectivity test passed",
      details: {
        blockNumber,
        contractAddress,
        contractMethods: contractMethods.slice(0, 10),
        gsnProviderStatus,
        whitelistContract: GSN_CONFIG.registryAddress,
        forwarder: GSN_CONFIG.forwarderAddress,
        paymaster: GSN_CONFIG.paymasterAddress,
        chainId: GSN_CONFIG.chainId,
      },
    };
  } catch (error) {
    return {
      success: false,
      message: "GSN connectivity test failed",
      error: error.message,
    };
  }
}
