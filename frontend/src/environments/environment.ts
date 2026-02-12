// src/environments/environment.ts
/* 
export const environment = {
  production: false,
  backendUrl: 'http://localhost:4000',
  PROVIDER_URL: 'http://127.0.0.1:8545',          // ← Added
  PRIVATE_KEY: ''                                 // ← Added (empty in prod, fill in .env for dev)
};
*/


// src/environments/environment.ts (for local dev testing against live backend)
export const environment = {
  production: false,
  backendUrl: 'https://pimv-backend.onrender.com',
  PROVIDER_URL: 'https://sepolia.base.org',
  PRIVATE_KEY: '',
  forwarderAddress: '0xCcD7bAB94081f4B948B78d189492790CE51a413e',
  identityRegistryAddress: '0x3F0b694f12e767868CB57b363578F7c5db55e553'
};
