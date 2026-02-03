// src/environments/environment.ts
export const environment = {
  production: false,
  backendUrl: 'http://localhost:4000',
  PROVIDER_URL: 'http://127.0.0.1:8545',          // ← Added
  PRIVATE_KEY: ''                                 // ← Added (empty in prod, fill in .env for dev)
};
/** 
// src/environments/environment.ts (for local dev testing against live backend)
export const environment = {
  production: false,
  backendUrl: 'https://pimv-backend.onrender.com',
  PROVIDER_URL: 'https://sepolia.infura.io/v3/YOUR_INFURA_PROJECT_ID',
  PRIVATE_KEY: ''
};
*/