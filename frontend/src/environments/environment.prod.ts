// src/environments/environment.prod.ts
export const environment = {
  production: true,
  
  // Point to your live Render backend
  backendUrl: 'https://pimv-backend.onrender.com',
  
  // Optional: you can expose these if your frontend needs them directly
  // (but usually frontend only calls /api/... endpoints)
  PROVIDER_URL: 'https://sepolia.infura.io/v3/11155111', // ← use real testnet/mainnet RPC
  PRIVATE_KEY: '' // ← NEVER put real keys here! Keep empty in frontend
};