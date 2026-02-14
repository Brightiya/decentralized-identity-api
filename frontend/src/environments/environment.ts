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
  forwarderAddress: "0x32D23678E8725e30e0b9ACE110A5E720101CB5A0",
  IDENTITY_REGISTRY_META_ADDRESS: "0x883EeF581d6170E0d3906904c59b95E79016BD59"
};
