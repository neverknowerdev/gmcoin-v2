// config/chains.ts
import { base } from 'viem/chains';

// Use Base Mainnet for all environments
export type AppChain = typeof base;

// Export the global chain - always use Base Mainnet
export const chain: AppChain = base;

// Optional: Export chain ID for easy access
export const chainId = chain.id;

