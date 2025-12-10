import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-ethers";
import "@nomicfoundation/hardhat-chai-matchers";
import "@nomicfoundation/hardhat-verify";
import "@typechain/hardhat";
import "@openzeppelin/hardhat-upgrades";
import "@gelatonetwork/web3-functions-sdk/hardhat-plugin";

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.30",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  defaultNetwork: "hardhat",
  networks: {
    hardhat: {
      chainId: 31337,
      mining: {
        auto: true,
        interval: 1000 // 1 second
      },
    },
    sepolia: {
      url: process.env.SEPOLIA_RPC_URL || "",
      accounts: process.env.SEPOLIA_PRIVATE_KEY ? [process.env.SEPOLIA_PRIVATE_KEY] : [],
    },
    baseSepolia: {
      url: process.env.BASE_SEPOLIA_RPC_URL || "https://sepolia.base.org",
      accounts: process.env.BASE_SEPOLIA_PRIVATE_KEY ? [process.env.BASE_SEPOLIA_PRIVATE_KEY] : [],
      chainId: 84532,
    },
    monadTestnet: {
      url: process.env.MONAD_TESTNET_RPC_URL || "https://testnet-rpc.monad.xyz",
      accounts: process.env.MONAD_TESTNET_PRIVATE_KEY ? [process.env.MONAD_TESTNET_PRIVATE_KEY] : [],
      chainId: 10143,
    },
    worldchainSepolia: {
      chainId: 4801,
      url: "https://worldchain-sepolia.g.alchemy.com/public",
      accounts: process.env.WORLDCHAIN_SEPOLIA_PRIVATE_KEY ? [process.env.WORLDCHAIN_SEPOLIA_PRIVATE_KEY] : [],
    }

  },
  w3f: {
    rootDir: "./web3-functions",
    debug: false,
    networks: ["hardhat"], //(multiChainProvider) injects provider for these networks
  },
  etherscan: {
    apiKey: process.env.ETHERSCAN_API_KEY || "",
    customChains: [
      {
        network: "monadTestnet",
        chainId: 10143,
        urls: {
          apiURL: "https://api.etherscan.io/v2/api?chainid=10143",
          browserURL: "https://testnet.monadscan.com",
        },
      },
      {
        network: "worldchainSepolia",
        chainId: 4801,
        urls: {
          apiURL: "https://api.etherscan.io/v2/api?chainid=4801",
          browserURL: "https://sepolia.worldscan.org/",
        },
      },
    ]
  }
} as HardhatUserConfig;

export default config;
