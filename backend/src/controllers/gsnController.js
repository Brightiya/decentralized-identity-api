// backend/src/controllers/gsnController.js
import { 
  isGSNEnabled, 
  getGSNConfigForFrontend,
  prepareGSNTransaction,
  prepareGSNRegisterIdentity,
  prepareGSNSetProfileCID,  
  getGSNHealth,
  testGSNConnectivity,
  isUserWhitelistedForGSN
} from '../utils/contract-gsn.js';


/* ------------------------------------------------------------------
   GET GSN CONFIGURATION (Public)
------------------------------------------------------------------- */
export const getGSNConfig = async (req, res) => {
  try {
    const config = getGSNConfigForFrontend();
    res.status(200).json(config);
  } catch (error) {
    console.error('❌ getGSNConfig error:', error);
    res.status(500).json({ 
      error: 'Failed to get GSN configuration',
      gsnEnabled: false 
    });
  }
};

/* ------------------------------------------------------------------
   GET GSN STATUS/HEALTH (Public)
------------------------------------------------------------------- */
export const getGSNStatus = async (req, res) => {
  try {
    const health = getGSNHealth();
    const connectivity = await testGSNConnectivity();
    
    res.status(200).json({
      ...health,
      connectivity,
      serverTime: new Date().toISOString(),
    });
  } catch (error) {
    console.error('❌ getGSNStatus error:', error);
    res.status(500).json({ 
      gsnEnabled: false,
      status: 'ERROR',
      error: 'Failed to get GSN status'
    });
  }
};

/* ------------------------------------------------------------------
   CHECK GSN WHITELIST STATUS (Public)
------------------------------------------------------------------- */
export const checkGSNWhitelist = async (req, res) => {
  try {
    const { address } = req.params;
    
    if (!address) {
      return res.status(400).json({ error: 'Address is required' });
    }
    
    const normalizedAddress = address.toLowerCase();
    
    const isWhitelisted = await isUserWhitelistedForGSN(normalizedAddress);
    
    res.status(200).json({
      address: normalizedAddress,
      isWhitelisted,
      gsnEnabled: isGSNEnabled(),
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('❌ checkGSNWhitelist error:', error);
    res.status(500).json({ 
      error: 'Failed to check whitelist status',
      address: req.params.address 
    });
  }
};

/* ------------------------------------------------------------------
   PREPARE GSN REGISTER IDENTITY (Protected)
   registerIdentity(string cid)
------------------------------------------------------------------- */
export const prepareGSNRegisterIdentityTx = async (req, res) => {
  try {
    const { userAddress } = req.body;

    if (!isGSNEnabled()) {
      return res.status(400).json({ error: "GSN not enabled" });
    }

    if (!userAddress) {
      return res
        .status(400)
        .json({ error: "userAddress are required" });
    }

    const normalized = userAddress.toLowerCase();
    const isWhitelisted = await isUserWhitelistedForGSN(normalized);

    if (!isWhitelisted) {
      return res.status(403).json({
        error: "Not whitelisted for GSN",
        address: normalized,
      });
    }

    const txData = await prepareGSNRegisterIdentity(userAddress);

    res.status(200).json({
      success: true,
      operation: "registerIdentity",
      userAddress: normalized,
      txData,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("❌ prepareGSNRegisterIdentityTx error:", error);
    res.status(500).json({
      error: "Failed to prepare registerIdentity transaction",
      message: error.message,
    });
  }
};

/* ------------------------------------------------------------------
   PREPARE GSN SET PROFILE CID (Protected)
------------------------------------------------------------------- */
export const prepareGSNSetProfileCIDTx = async (req, res) => {
  try {
    const { owner, cid } = req.body;

    if (!isGSNEnabled()) {
      return res.status(400).json({ error: "GSN not enabled" });
    }

    if (!owner || !cid) {
      return res
        .status(400)
        .json({ error: "owner and cid are required" });
    }

    const normalized = owner.toLowerCase();
    const isWhitelisted = await isUserWhitelistedForGSN(normalized);

    if (!isWhitelisted) {
      return res.status(403).json({
        error: "Not whitelisted for GSN",
        address: normalized,
      });
    }

    const txData = await prepareGSNSetProfileCID(normalized, cid);

    res.status(200).json({
      success: true,
      operation: "setProfileCID",
      owner: normalized,
      cid,
      txData,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("❌ prepareGSNSetProfileCIDTx error:", error);
    res.status(500).json({
      error: "Failed to prepare setProfileCID transaction",
      message: error.message,
    });
  }
};

/* ------------------------------------------------------------------
   PREPARE GENERIC GSN TRANSACTION (Protected)
------------------------------------------------------------------- */
export const prepareGSNTransactionTx = async (req, res) => {
  try {
    const { methodName, args = [] } = req.body;

    if (!isGSNEnabled()) {
      return res.status(400).json({ error: "GSN not enabled" });
    }

    if (!methodName) {
      return res.status(400).json({ error: "methodName is required" });
    }

    // Hard block identity creation from generic endpoint
    if (methodName === "registerIdentity") {
      return res.status(400).json({
        error: "registerIdentity must use the dedicated endpoint",
      });
    }

    // Try to extract user address from args
    let userAddress = null;
    const ethAddressRegex = /^0x[a-fA-F0-9]{40}$/;

    for (const arg of args) {
      if (typeof arg === "string" && ethAddressRegex.test(arg)) {
        userAddress = arg.toLowerCase();
        break;
      }
    }

    if (userAddress) {
      const isWhitelisted = await isUserWhitelistedForGSN(userAddress);
      if (!isWhitelisted) {
        return res.status(403).json({
          error: "Not whitelisted for GSN",
          address: userAddress,
        });
      }
    }

    const txData = await prepareGSNTransaction(methodName, ...args);

    res.status(200).json({
      success: true,
      operation: methodName,
      userAddress,
      txData,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("❌ prepareGSNTransactionTx error:", error);
    res.status(500).json({
      error: "Failed to prepare GSN transaction",
      message: error.message,
    });
  }
};