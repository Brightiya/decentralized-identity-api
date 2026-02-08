// hardhat.config.cjs
// hardhat.config.cjs
require("@nomicfoundation/hardhat-toolbox");
const { config } = require("dotenv");
const { resolve } = require("path");

config({ path: resolve(__dirname, ".env") });

require("dotenv").config({ path: "./.env", debug: true });

// Add path resolution for GSN
const path = require('path');

console.log("=== Hardhat config debug ===");
console.log("SEPOLIA_RPC_URL:", process.env.SEPOLIA_RPC_URL ? "present" : "MISSING");
console.log("PRIVATE_KEY:", process.env.PRIVATE_KEY ? "present (length " + process.env.PRIVATE_KEY.length + ")" : "MISSING");

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

  // Add paths configuration
  paths: {
    sources: "./contracts",
    cache: "./cache",
    artifacts: "./artifacts",
    // This helps Hardhat find GSN contracts
    root: path.resolve(__dirname)
  },

  // Configure import remapping
  external: {
    contracts: [
      {
        "@opengsn/contracts": path.resolve(__dirname, "node_modules/@opengsn/contracts")
      }
    ]
  },

  networks: {
    hardhat: {
      chainId: 31337,
      mining: {
        auto: false,
        interval: 5000
      },
      // Allow importing from node_modules
      external: {
        "@opengsn/contracts": "0x0000000000000000000000000000000000000000"
      }
    },

    localhost: {
      url: "http://127.0.0.1:8545",
    },

    sepolia: {
      url: process.env.SEPOLIA_RPC_URL || "https://eth-sepolia.g.alchemy.com/v2/ONCQCIpuYrE9eg-Y_5dS_",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY.trim()] : [],
      chainId: 11155111,
      gasPrice: "auto",
      timeout: 60000,
    },
    monadTestnet: {
      url: "https://monad-testnet.g.alchemy.com/v2/ONCQCIpuYrE9eg-Y_5dS_",
      accounts: [process.env.PRIVATE_KEY],
      chainId: 10143,
      gasPrice: "auto",
      timeout: 60000,
    },
    baseSepolia: {
      url: "https://sepolia.base.org",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY.trim()] : [],
      chainId: 84532,
      gasPrice: "auto",
      timeout: 60000,
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
console.log("Sepolia accounts configured:", module.exports.networks.sepolia.accounts);