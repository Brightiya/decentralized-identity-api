// hardhat.config.mjs
import "@nomicfoundation/hardhat-toolbox";
import { config as dotenvConfig } from "dotenv";
import { resolve } from "path";

// Workaround for __dirname in ESM
import { fileURLToPath } from "url";
import { dirname } from "path";
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenvConfig({ path: resolve(__dirname, ".env") });

const { SEPOLIA_RPC_URL, AMOY_RPC_URL, PRIVATE_KEY } = process.env;

const config = {
  solidity: "0.8.20",
  networks: {
    hardhat: {
      chainId: 31337,
    },
    localhost: {
      url: "http://127.0.0.1:8545",
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
};

export default config;