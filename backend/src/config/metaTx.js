export const META_TX_CONFIG = {
  forwarderAddress: process.env.FORWARDER_ADDRESS,
  registryAddress: process.env.IDENTITY_REGISTRY_GSN_ADDRESS,
  chainId: parseInt(process.env.CHAIN_ID) || 84532, // BaseSepolia
  gasLimit: 1000000,
};
