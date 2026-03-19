export const META_TX_CONFIG = {
  forwarderAddress: process.env.FORWARDER_ADDRESS,
  // Address of the trusted forwarder contract (used for meta-transactions)

  registryAddress: process.env.IDENTITY_REGISTRY_META_ADDRESS,
  // Address of the IdentityRegistryMeta smart contract

  chainId: parseInt(process.env.CHAIN_ID) || 84532, // BaseSepolia
  // Blockchain network chain ID, parsed from environment variable
  // Defaults to 84532 (Base Sepolia testnet) if not provided

  gasLimit: 1000000,
  // Default gas limit to use for meta-transactions
};