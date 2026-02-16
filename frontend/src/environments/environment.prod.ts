// src/environments/environment.prod.ts
export const environment = {
  production: true,
  
  // Point to your live Render backend
  backendUrl: 'https://pimv-backend.onrender.com',
  
  // Optional: you can expose these if your frontend needs them directly
  // (but usually frontend only calls /api/... endpoints)
  PROVIDER_URL: 'https://sepolia.base.org', // ← use real testnet/mainnet RPC
  PRIVATE_KEY: '', // ← NEVER put real keys here! Keep empty in frontend

  // forwarderAddress:"0x32D23678E8725e30e0b9ACE110A5E720101CB5A0", // old
  forwarderAddress:"0x6084b17aDaF3a1f27945c4157e2B1B9a5674Bd91", // new
  //IDENTITY_REGISTRY_META_ADDRESS: "0x883EeF581d6170E0d3906904c59b95E79016BD59" // old
  IDENTITY_REGISTRY_META_ADDRESS: "0x6Ca5eeF000eBA1202eC15A48d9Ee8ac852Fc556C" // new

 // IDENTITY_REGISTRY_META_ADDRESS: '0x3F0b694f12e767868CB57b363578F7c5db55e553',
 // forwarderAddress: '0xCcD7bAB94081f4B948B78d189492790CE51a413e'

};