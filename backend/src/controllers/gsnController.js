// backend/src/controllers/gsnController.js
import { 
  isGSNEnabled, 
  getGSNConfigForFrontend,
  prepareGSNTransaction,
  prepareGSNSetProfileCID,
  prepareGSNCreateProfile,  // Now being used
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
   PREPARE GSN CREATE PROFILE TRANSACTION (Protected)
------------------------------------------------------------------- */
export const prepareGSNCreateProfileTx = async (req, res) => {
  try {
    const { subjectAddress } = req.body;
    
    if (!isGSNEnabled()) {
      return res.status(400).json({ error: 'GSN not enabled' });
    }
    
    if (!subjectAddress) {
      return res.status(400).json({ error: 'Subject address required' });
    }
    
    // Check if user is whitelisted
    const isWhitelisted = await isUserWhitelistedForGSN(subjectAddress);
    if (!isWhitelisted) {
      return res.status(403).json({ 
        error: 'Not whitelisted for GSN',
        address: subjectAddress,
        isWhitelisted: false 
      });
    }
    
    // Prepare the transaction
    const txData = await prepareGSNCreateProfile(subjectAddress);
    
    res.status(200).json({
      success: true,
      txData,
      operation: 'createProfile',
      subject: subjectAddress,
      timestamp: new Date().toISOString(),
    });
    
  } catch (error) {
    console.error('❌ prepareGSNCreateProfileTx error:', error);
    res.status(500).json({ 
      error: 'Failed to prepare GSN createProfile transaction',
      message: error.message 
    });
  }
};

/* ------------------------------------------------------------------
   PREPARE GSN SET PROFILE CID TRANSACTION (Protected)
------------------------------------------------------------------- */
export const prepareGSNSetProfileCIDTx = async (req, res) => {
  try {
    const { subjectAddress, cid } = req.body;
    
    if (!isGSNEnabled()) {
      return res.status(400).json({ error: 'GSN not enabled' });
    }
    
    if (!subjectAddress || !cid) {
      return res.status(400).json({ error: 'Subject address and CID required' });
    }
    
    // Check if user is whitelisted
    const isWhitelisted = await isUserWhitelistedForGSN(subjectAddress);
    if (!isWhitelisted) {
      return res.status(403).json({ 
        error: 'Not whitelisted for GSN',
        address: subjectAddress,
        isWhitelisted: false 
      });
    }
    
    // Prepare the transaction
    const txData = await prepareGSNSetProfileCID(subjectAddress, cid);
    
    res.status(200).json({
      success: true,
      txData,
      operation: 'setProfileCID',
      subject: subjectAddress,
      cid,
      timestamp: new Date().toISOString(),
    });
    
  } catch (error) {
    console.error('❌ prepareGSNSetProfileCIDTx error:', error);
    res.status(500).json({ 
      error: 'Failed to prepare GSN setProfileCID transaction',
      message: error.message 
    });
  }
};

/* ------------------------------------------------------------------
   PREPARE GENERAL GSN TRANSACTION (Protected)
------------------------------------------------------------------- */
export const prepareGSNTransactionTx = async (req, res) => {
  try {
    const { methodName, args } = req.body;
    
    if (!isGSNEnabled()) {
      return res.status(400).json({ error: 'GSN not enabled' });
    }
    
    if (!methodName) {
      return res.status(400).json({ error: 'Method name required' });
    }
    
    // Extract user address from args if possible (first arg is often the user)
    let userAddress = null;
    if (args && args.length > 0) {
      // Try to find an Ethereum address in the args
      const ethAddressRegex = /^0x[a-fA-F0-9]{40}$/;
      for (const arg of args) {
        if (typeof arg === 'string' && ethAddressRegex.test(arg)) {
          userAddress = arg.toLowerCase();
          break;
        }
      }
    }
    
    if (userAddress) {
      // Check if user is whitelisted
      const isWhitelisted = await isUserWhitelistedForGSN(userAddress);
      if (!isWhitelisted) {
        return res.status(403).json({ 
          error: 'Not whitelisted for GSN',
          address: userAddress,
          isWhitelisted: false 
        });
      }
    }
    
    // Prepare the transaction
    const txData = await prepareGSNTransaction(methodName, ...args);
    
    if (userAddress) {
      txData.userAddress = userAddress;
    }
    
    res.status(200).json({
      success: true,
      txData,
      operation: methodName,
      userAddress,
      timestamp: new Date().toISOString(),
    });
    
  } catch (error) {
    console.error('❌ prepareGSNTransactionTx error:', error);
    res.status(500).json({ 
      error: 'Failed to prepare GSN transaction',
      message: error.message 
    });
  }
};