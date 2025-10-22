require("@nomicfoundation/hardhat-toolbox");
const { config } = require("dotenv");
const { resolve } = require("path");

// Load .env from the root directory (so it works in CI and locally)
config({ path: resolve(__dirname, "../.env") });

const { SEPOLIA_RPC_URL, AMOY_RPC_URL, PRIVATE_KEY } = process.env;

module.exports = {
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
    hardhat: {
      chainId: 31337,
    },
    localhost: {
      url: "http://127.0.0.1:8545",
      accounts: PRIVATE_KEY ? [PRIVATE_KEY] : [],
    },
    ...(SEPOLIA_RPC_URL && PRIVATE_KEY
      ? {
          sepolia: {
            url: SEPOLIA_RPC_URL,
            accounts: [PRIVATE_KEY],
          },
        }
      : {}),
    ...(AMOY_RPC_URL && PRIVATE_KEY
      ? {
          amoy: {
            url: AMOY_RPC_URL,
            accounts: [PRIVATE_KEY],
          },
        }
      : {}),
  },
  gasReporter: {
    enabled: false,
  },
  mocha: {
    timeout: 20000,
  },
};
