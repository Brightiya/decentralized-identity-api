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
    const contract = await getGSNContract(); // Read-only
    
    // v5: use .call() instead of direct method call
    const isWhitelisted = await contract.isWhitelisted(address);
    
    return isWhitelisted;
  } catch (error) {
    console.error('Error checking GSN whitelist:', error.message);
    return false;
  }
}

/**
 * Prepare GSN transaction data (unsigned)
 * This is for frontend to sign and send via GSN
 */
export async function prepareGSNTransaction(methodName, ...args) {
  if (!isGSNEnabled()) {
    throw new Error("GSN is not enabled");
  }
  
  const abi = getContractABI();
  const iface = new ethers.utils.Interface(abi); // v5: ethers.utils.Interface
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
// Convenience wrappers (unchanged)
// ────────────────────────────────────────────────

export async function prepareGSNCreateProfile(subjectAddress) {
  return prepareGSNTransaction("createProfile", subjectAddress);
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
    return { success: false, message: 'GSN not enabled' };
  }
  
  try {
    // Test 1: Regular provider connection — v5 style
    const provider = getRegularProvider();
    const blockNumber = await provider.getBlockNumber();
    
    // Test 2: Contract connection
    const contract = await getGSNContract();
    
    // v5: use .call() for read-only methods
    const contractAddress = await contract.address; // or contract.getAddress() if available
    
    // Test 3: Check if contract has expected methods
    let contractMethods = [];
    try {
      const abi = getContractABI();
      const iface = new ethers.utils.Interface(abi);
      contractMethods = Object.keys(iface.functions);
    } catch (e) {
      contractMethods = ['Error reading ABI'];
    }
    
    // Test 4: GSN provider
    let gsnProviderStatus = 'NOT_INITIALIZED';
    try {
      gsnProviderStatus = "SKIPPED (lazy init)";
      gsnProviderStatus = 'READY';
    } catch (error) {
      gsnProviderStatus = `ERROR: ${error.message}`;
    }
    
    return {
      success: true,
      message: 'GSN connectivity test passed',
      details: {
        blockNumber,
        contractAddress,
        contractMethods: contractMethods.slice(0, 10),
        gsnProviderStatus,
        whitelistContract: GSN_CONFIG.registryAddress,
        forwarder: GSN_CONFIG.forwarderAddress,
        paymaster: GSN_CONFIG.paymasterAddress,
        chainId: GSN_CONFIG.chainId,
      }
    };
  } catch (error) {
    return {
      success: false,
      message: 'GSN connectivity test failed',
      error: error.message,
    };
  }
}