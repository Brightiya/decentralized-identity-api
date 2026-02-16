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
 // forwarderAddress: "0x32D23678E8725e30e0b9ACE110A5E720101CB5A0", // old
 forwarderAddress:"0x6084b17aDaF3a1f27945c4157e2B1B9a5674Bd91", // new
 // IDENTITY_REGISTRY_META_ADDRESS: "0x883EeF581d6170E0d3906904c59b95E79016BD59" // old
 IDENTITY_REGISTRY_META_ADDRESS: "0x6Ca5eeF000eBA1202eC15A48d9Ee8ac852Fc556C" // new
};
