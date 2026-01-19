// src/environments/environment.ts
export const environment = {
  production: false,
  backendUrl: 'http://localhost:4000',
  PROVIDER_URL: 'http://127.0.0.1:8545',          // ← Added
  PRIVATE_KEY: ''                                 // ← Added (empty in prod, fill in .env for dev)
};