require("@nomicfoundation/hardhat-toolbox");
const { config } = require("dotenv");
const { resolve } = require("path");

config({ path: resolve(__dirname, ".env") });

console.log("=== Hardhat config debug ===");
console.log("SEPOLIA_RPC_URL:", process.env.SEPOLIA_RPC_URL ? "present" : "MISSING");
console.log("PRIVATE_KEY:", process.env.PRIVATE_KEY ? "present" : "MISSING");

module.exports = {
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      }
    }
  },

  paths: {
    sources: "./contracts",
    cache: "./cache",
    artifacts: "./artifacts"
  },

  networks: {
    hardhat: {
      chainId: 31337,
      mining: {
        auto: false,
        interval: 5000
      }
    },

   // localhost: {
    //  url: "http://127.0.0.1:8545",
   // },

    sepolia: {
      url: process.env.SEPOLIA_RPC_URL,
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY.trim()] : [],
      chainId: 11155111,
    },

    monadTestnet: {
      url: "https://monad-testnet.g.alchemy.com/v2/...",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY.trim()] : [],
      chainId: 10143,
    },

    baseSepolia: {
      url: "https://sepolia.base.org",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY.trim()] : [],
      chainId: 84532,
    },
  },

  mocha: {
    timeout: 60000,
  },

  gasReporter: {
    enabled: false,
  },
};

console.log("=== Hardhat config debug end ===");
