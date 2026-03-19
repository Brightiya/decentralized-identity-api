export const environment = {
  production: true,
  // Indicates production mode (used for optimizations and environment-specific behavior)
  
  // Point to fly.io
  backendUrl:  '',
  
  PROVIDER_URL: 'https://sepolia.base.org', 
  // RPC endpoint for Base Sepolia network

  PRIVATE_KEY: '', 
  // Private key (should NEVER be exposed in frontend in real applications)

  FORWARDER_ADDRESS:"0x7E5ea500009234dcD3Db61acffB2fe2FFEFa4B47", 
  // Address of ERC2771 forwarder contract for meta-transactions

  IDENTITY_REGISTRY_META_ADDRESS: "0x6DA325f93430D8b6A5382E9a9cF73b4a4Fbf72d1" 
  // Address of IdentityRegistryMeta smart contract

};