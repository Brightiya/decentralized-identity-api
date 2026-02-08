// backend/src/config/gsn.js
export const GSN_CONFIG = {
  enabled: process.env.GSN_ENABLED === 'true',
  forwarderAddress: process.env.GSN_FORWARDER_ADDRESS,
  paymasterAddress: process.env.GSN_PAYMASTER_ADDRESS,
  registryAddress: process.env.IDENTITY_REGISTRY_GSN_ADDRESS || process.env.IDENTITY_REGISTRY_ADDRESS,
  chainId: parseInt(process.env.CHAIN_ID) || 84532, // baseSepolia
  // GSN Relay options
  relayServer: process.env.GSN_RELAY_SERVER || 'https://gsn-relayer.example.com',
  relayLookupWindowBlocks: 1000000,
  // Gas limits
  gasLimit: '1000000',
  maxFeePerGas: '10000000000', // 10 gwei
  maxPriorityFeePerGas: '1000000000', // 1 gwei
};