import { base, baseSepolia } from "wagmi/chains";
import { defineChain } from "viem";

// Worldchain Mainnet (Chain ID: 480)
export const worldchain = defineChain({
  id: 480,
  name: "World Chain",
  network: "worldchain",
  nativeCurrency: {
    name: "Ether",
    symbol: "ETH",
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: [
        process.env.NEXT_PUBLIC_WORLDCHAIN_MAINNET_RPC_URL || "https://worldchain-mainnet.g.alchemy.com/public",
      ],
    },
    public: {
      http: [
        process.env.NEXT_PUBLIC_WORLDCHAIN_MAINNET_RPC_URL || "https://worldchain-mainnet.g.alchemy.com/public",
        "https://480.rpc.thirdweb.com",
        "https://worldchain-mainnet.gateway.tenderly.co",
        "https://worldchain.drpc.org",
      ],
    },
  },
  blockExplorers: {
    default: {
      name: "WorldScan",
      url: "https://worldscan.org",
    },
  },
});

// Worldchain Sepolia (Chain ID: 4801)
export const worldchainSepolia = defineChain({
  id: 4801,
  name: "World Chain Sepolia",
  network: "worldchain-sepolia",
  nativeCurrency: {
    name: "Sepolia Ether",
    symbol: "ETH",
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: [
        process.env.NEXT_PUBLIC_WORLDCHAIN_SEPOLIA_RPC_URL || "https://worldchain-sepolia.g.alchemy.com/public",
      ],
    },
    public: {
      http: [
        process.env.NEXT_PUBLIC_WORLDCHAIN_SEPOLIA_RPC_URL || "https://worldchain-sepolia.g.alchemy.com/public",
        "https://4801.rpc.thirdweb.com",
        "https://worldchain-sepolia.gateway.tenderly.co",
        "https://worldchain-sepolia.drpc.org",
      ],
    },
  },
  blockExplorers: {
    default: {
      name: "WorldScan Sepolia",
      url: "https://sepolia.worldscan.org",
    },
  },
});

/**
 * Determines if we should use testnet chains
 */
export function useTestnet(): boolean {
  return process.env.NEXT_PUBLIC_USE_TESTNET === "true";
}

/**
 * Gets the browser chain preference (base or worldchain)
 * Defaults to "base" if not set
 */
export function getBrowserChainPreference(): "base" | "worldchain" {
  const pref = process.env.NEXT_PUBLIC_BROWSER_CHAIN?.toLowerCase();
  if (pref === "worldchain") {
    return "worldchain";
  }
  return "base"; // Default to base
}

/**
 * Gets the target chain for Farcaster mini-app
 * - Base Mainnet (if not testnet)
 * - Base Sepolia (if testnet)
 */
export function getMiniAppChain() {
  if (useTestnet()) {
    return baseSepolia;
  }
  return base;
}

/**
 * Gets the target chain for browser wallet (Dynamic)
 * - Base Mainnet or Worldchain Mainnet (if not testnet)
 * - Base Sepolia or Worldchain Sepolia (if testnet)
 */
export function getBrowserChain() {
  const isTestnet = useTestnet();
  const preference = getBrowserChainPreference();

  if (preference === "worldchain") {
    return isTestnet ? worldchainSepolia : worldchain;
  }

  // Default to Base
  return isTestnet ? baseSepolia : base;
}

/**
 * Gets the expected chain ID based on environment
 * @param isMiniApp - Whether running in Farcaster mini-app
 */
export function getExpectedChainId(isMiniApp: boolean): number {
  if (isMiniApp) {
    return getMiniAppChain().id;
  }
  return getBrowserChain().id;
}

/**
 * Gets the expected chain name for display
 * @param isMiniApp - Whether running in Farcaster mini-app
 */
export function getExpectedChainName(isMiniApp: boolean): string {
  if (isMiniApp) {
    return getMiniAppChain().name;
  }
  return getBrowserChain().name;
}

/**
 * Gets the RPC URL for the target chain
 * @param isMiniApp - Whether running in Farcaster mini-app
 */
export function getRpcUrl(isMiniApp: boolean): string {
  const chain = isMiniApp ? getMiniAppChain() : getBrowserChain();
  const isTestnet = useTestnet();

  // For Base chains, check for specific env vars
  if (chain.id === base.id) {
    return (
      process.env.NEXT_PUBLIC_BASE_MAINNET_RPC_URL ||
      "https://mainnet.base.org"
    );
  }

  if (chain.id === baseSepolia.id) {
    return (
      process.env.NEXT_PUBLIC_BASE_SEPOLIA_RPC_URL ||
      "https://sepolia.base.org"
    );
  }

  // For Worldchain chains
  if (chain.id === worldchain.id) {
    return (
      process.env.NEXT_PUBLIC_WORLDCHAIN_MAINNET_RPC_URL ||
      "https://worldchain-mainnet.g.alchemy.com/public"
    );
  }

  if (chain.id === worldchainSepolia.id) {
    return (
      process.env.NEXT_PUBLIC_WORLDCHAIN_SEPOLIA_RPC_URL ||
      "https://worldchain-sepolia.g.alchemy.com/public"
    );
  }

  // Fallback to chain's default RPC
  return chain.rpcUrls.default.http[0];
}
