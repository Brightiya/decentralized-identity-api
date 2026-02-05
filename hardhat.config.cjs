// hardhat.config.cjs
require("@nomicfoundation/hardhat-toolbox");
const { config } = require("dotenv");
const { resolve } = require("path");

config({ path: resolve(__dirname, ".env") });


require("dotenv").config({ path: "./.env", debug: true }); // ← force + debug

console.log("=== Hardhat config debug ===");
console.log("SEPOLIA_RPC_URL:", process.env.SEPOLIA_RPC_URL ? "present" : "MISSING");
console.log("PRIVATE_KEY:", process.env.PRIVATE_KEY ? "present (length " + process.env.PRIVATE_KEY.length + ")" : "MISSING");

const { SEPOLIA_RPC_URL, PRIVATE_KEY } = process.env;

module.exports = {
  solidity: "0.8.20",

  networks: {
    hardhat: {
      chainId: 31337,
      mining: {
        auto: false,           // Keep disabled for manual mining control
        interval: 5000
      },
    },

    localhost: {
      url: "http://127.0.0.1:8545",
    },

    // ────────────────────────────────────────────────
    // Sepolia — real testnet using your Alchemy URL
    // ────────────────────────────────────────────────
    sepolia: {
      url: process.env.SEPOLIA_RPC_URL || "https://eth-sepolia.g.alchemy.com/v2/ONCQCIpuYrE9eg-Y_5dS_", // fallback if .env missing
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY.trim()] : [],
      chainId: 11155111,           // Sepolia chain ID
      gasPrice: "auto",            // or set fixed: 2000000000 (2 gwei)
      timeout: 60000,              // longer timeout for testnet
    },
    monadTestnet: {
    url: "https://monad-testnet.g.alchemy.com/v2/ONCQCIpuYrE9eg-Y_5dS_",
    accounts: [process.env.PRIVATE_KEY],
    chainId: 10143,
    gasPrice: "auto",
    timeout: 60000,
  },
  baseSepolia: {
    url: "https://84532.rpc.thirdweb.com",
    accounts: [process.env.PRIVATE_KEY],
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