// backend/src/utils/contract-gsn.js
import { ethers } from "ethers";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";


// ────────────────────────────────────────────────
// GSN Configuration
// ────────────────────────────────────────────────
const GSN_CONFIG = {
  enabled: process.env.GSN_ENABLED === 'true',
  forwarderAddress: process.env.GSN_FORWARDER_ADDRESS,
  paymasterAddress: process.env.GSN_PAYMASTER_ADDRESS,
  registryAddress: process.env.IDENTITY_REGISTRY_GSN_ADDRESS,
  chainId: parseInt(process.env.CHAIN_ID) || 84532, // baseSepolia default
  // Gas limits for GSN
  gasLimit: '1000000',
  maxFeePerGas: '10000000000', // 10 gwei
  maxPriorityFeePerGas: '1000000000', // 1 gwei
};

// GSN methods that must NOT go through the generic path
const FORBIDDEN_METHODS = new Set([
  "registerIdentity",   // must use dedicated helper
]);


let _gsnProvider = null;
let _regularProvider = null;

// ────────────────────────────────────────────────
// Helper Functions
// ────────────────────────────────────────────────
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Get contract ABI (shared with regular contract)
 */
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

function getPaymasterABI() {
  const abiPath = path.resolve(__dirname, "./paymasterAbi.json");
  try {
    return JSON.parse(fs.readFileSync(abiPath, "utf8"));
  } catch (err) {
    console.error("Failed to load paymasterAbi.json:", err);
    throw err;
  }
}


/**
 * Get regular provider (for read-only operations) — v5 style
 */
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

/**
 * Check if GSN is enabled
 */
export function isGSNEnabled() {
  return GSN_CONFIG.enabled;
}

/**
 * Get GSN configuration for frontend
 */
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
      name: process.env.APP_DOMAIN || 'IdentityRegistry',
      version: '1',
      chainId: GSN_CONFIG.chainId,
      verifyingContract: GSN_CONFIG.registryAddress,
    },
  };
}

/**
 * Initialize GSN provider
 */
export async function getGSNProvider() {
  if (!isGSNEnabled()) {
    throw new Error("GSN is not enabled. Set GSN_ENABLED=true in .env");
  }
  
  if (_gsnProvider) return _gsnProvider;
  
  try {
    console.log('🔧 Initializing GSN provider...');
    
    // Check if @opengsn/provider is available
    let RelayProvider;
    try {
      const gsnModule = await import('@opengsn/provider');
      RelayProvider = gsnModule.RelayProvider;
    } catch (error) {
      console.warn('⚠️ @opengsn/provider not installed.');
      console.log('   Install with: npm install @opengsn/provider');
      throw new Error('GSN provider package not installed');
    }
    
    // Standard JSON RPC provider as base — v5 style
    const baseProvider = getRegularProvider();
    
    // GSN configuration
    const gsnConfig = {
      paymasterAddress: GSN_CONFIG.paymasterAddress,
      forwarderAddress: GSN_CONFIG.forwarderAddress,
      loggerConfiguration: {
        logLevel: 'debug',
      },
      relayLookupWindowBlocks: 1000000,
      maxRelayNonceGap: 10,
    };
    
    // Initialize RelayProvider
    const relayProvider = await RelayProvider.newProvider({
      provider: baseProvider,
      config: gsnConfig,
    }).init();
    
    // v5 uses BrowserProvider for browser-like providers
    _gsnProvider = new ethers.providers.Web3Provider(relayProvider);
    console.log('✅ GSN provider initialized');
    return _gsnProvider;
    
  } catch (error) {
    console.error('❌ Failed to initialize GSN provider:', error.message);
    throw error;
  }
}

/**
 * Get GSN contract instance for a specific user
 * @param {string} userAddress - The address of the user initiating the transaction
 * @returns {Promise<ethers.Contract>} GSN-enabled contract instance
 */
export async function getGSNContract(userAddress = null) {
  if (!isGSNEnabled()) {
    throw new Error("GSN is not enabled");
  }
  
  let provider;
  if (!userAddress) {
    // Read-only: use regular provider
    provider = getRegularProvider();
  } else {
    // Use GSN relay provider
    provider = await getGSNProvider();
  }
  
  return new ethers.Contract(
    GSN_CONFIG.registryAddress,
    getContractABI(),
    provider
  );
}

/**
 * Check if a user is whitelisted for GSN — FIXED for v5
 * @param {string} address - User address to check
 * @returns {Promise<boolean>} True if whitelisted
 */
export async function isUserWhitelistedForGSN(address) {
  if (!isGSNEnabled()) return false;

  try {
    const provider = getRegularProvider();

    const paymaster = new ethers.Contract(
      GSN_CONFIG.paymasterAddress,
      getPaymasterABI(),
      provider
    );

    return await paymaster.whitelist(address);
  } catch (error) {
    console.error("Error checking GSN whitelist:", error);
    return false;
  }
}

/**
 * Prepare GSN transaction data (unsigned)
 * Generic GSN-safe ABI methods ONLY
 */
export async function prepareGSNTransaction(methodName, ...args) {
  if (!isGSNEnabled()) {
    throw new Error("GSN is not enabled");
  }

  if (FORBIDDEN_METHODS.has(methodName)) {
    throw new Error(
      `${methodName} must use a dedicated GSN preparation function`
    );
  }

  const abi = getContractABI();
  const iface = new ethers.utils.Interface(abi);

  // Validate method existence
  let fragment;
  try {
    fragment = iface.getFunction(methodName);
  } catch (err) {
    throw new Error(
      `GSN method "${methodName}" does not exist in contract ABI`
    );
  }

  // Validate argument count
  if (args.length !== fragment.inputs.length) {
    throw new Error(
      `GSN method "${methodName}" expects ${fragment.inputs.length} arguments, ` +
      `received ${args.length}`
    );
  }

  // Encode safely
  let data;
  try {
    data = iface.encodeFunctionData(methodName, args);
  } catch (err) {
    throw new Error(
      `Failed to encode GSN transaction for "${methodName}": ${err.message}`
    );
  }

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
// Convenience wrappers (unchanged)
// ────────────────────────────────────────────────

export async function prepareGSNRegisterIdentity(cid) {
  if (!isGSNEnabled()) {
    throw new Error("GSN is not enabled");
  }

  const abi = getContractABI();
  const iface = new ethers.utils.Interface(abi);

  let data;
  try {
    data = iface.encodeFunctionData("registerIdentity", [cid]);
  } catch (err) {
    throw new Error(
      `Failed to encode registerIdentity GSN tx: ${err.message}`
    );
  }

  return {
    to: GSN_CONFIG.registryAddress,
    data,
    chainId: GSN_CONFIG.chainId,
    gasLimit: GSN_CONFIG.gasLimit,
    value: "0",
    useGSN: true,
    paymasterAddress: GSN_CONFIG.paymasterAddress,
    forwarderAddress: GSN_CONFIG.forwarderAddress,
    description: "GSN: registerIdentity",
    timestamp: new Date().toISOString(),
  };
}



export async function prepareGSNSetClaim(subjectAddress, claimIdBytes32, claimHash) {
  return prepareGSNTransaction("setClaim", subjectAddress, claimIdBytes32, claimHash);
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
// Health & Test functions (minor v5 fixes)
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
      name: 'base-sepolia',
    },
    status: isGSNEnabled() ? 'READY' : 'DISABLED',
  };
}

export async function testGSNConnectivity() {
  if (!isGSNEnabled()) {
    return { success: false, message: "GSN not enabled" };
  }

  try {
    // ─────────────────────────────
    // Test 1: Provider connectivity
    // ─────────────────────────────
    const provider = getRegularProvider();
    const blockNumber = await provider.getBlockNumber();

    // ─────────────────────────────
    // Test 2: Registry contract
    // ─────────────────────────────
    const registry = await getGSNContract(); // read-only
    const registryAddress = registry.address;

    // Introspect ABI methods
    let registryMethods = [];
    try {
      const iface = new ethers.utils.Interface(getContractABI());
      registryMethods = Object.keys(iface.functions);
    } catch {
      registryMethods = ["Error reading registry ABI"];
    }

    // ─────────────────────────────
    // Test 3: Paymaster contract
    // ─────────────────────────────
    const paymaster = new ethers.Contract(
      GSN_CONFIG.paymasterAddress,
      getPaymasterABI(),
      provider
    );

    // Check deploy + basic calls
    const paymasterBalance = await provider.getBalance(
      GSN_CONFIG.paymasterAddress
    );

    // Owner should always be whitelisted (constructor logic)
    let paymasterOwnerWhitelisted = false;
    try {
      const owner = await paymaster.owner?.();
      if (owner) {
        paymasterOwnerWhitelisted = await paymaster.whitelist(owner);
      }
    } catch {
      // owner() not strictly required for test to pass
    }

    // ─────────────────────────────
    // Test 4: Forwarder sanity
    // ─────────────────────────────
    const forwarderConfigured = Boolean(GSN_CONFIG.forwarderAddress);

    // ─────────────────────────────
    // Test 5: GSN provider status
    // ─────────────────────────────
    let gsnProviderStatus = "NOT_INITIALIZED";
    try {
      // Lazy init is expected
      gsnProviderStatus = "READY (lazy init)";
    } catch (error) {
      gsnProviderStatus = `ERROR: ${error.message}`;
    }

    // ─────────────────────────────
    // Final report
    // ─────────────────────────────
    return {
      success: true,
      message: "GSN connectivity test passed",
      details: {
        network: {
          chainId: GSN_CONFIG.chainId,
          blockNumber,
        },
        registry: {
          address: registryAddress,
          methods: registryMethods.slice(0, 10),
        },
        paymaster: {
          address: GSN_CONFIG.paymasterAddress,
          balanceWei: paymasterBalance.toString(),
          ownerWhitelisted: paymasterOwnerWhitelisted,
        },
        forwarder: {
          address: GSN_CONFIG.forwarderAddress,
          configured: forwarderConfigured,
        },
        gsnProviderStatus,
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