// src/environments/environment.prod.ts
export const environment = {
  production: true,
  
  // Point to your live Render backend
  backendUrl: 'https://pimv-backend.onrender.com',
  
  // Optional: you can expose these if your frontend needs them directly
  // (but usually frontend only calls /api/... endpoints)
  PROVIDER_URL: 'https://sepolia.base.org', // ← use real testnet/mainnet RPC
  PRIVATE_KEY: '', // ← NEVER put real keys here! Keep empty in frontend
  forwarderAddress: '0xCcD7bAB94081f4B948B78d189492790CE51a413e',
  identityRegistryAddress: '0x3F0b694f12e767868CB57b363578F7c5db55e553'

};