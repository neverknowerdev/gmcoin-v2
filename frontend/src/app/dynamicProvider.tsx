"use client";

import { DynamicContextProvider } from "@dynamic-labs/sdk-react-core";
import { EthereumWalletConnectors } from "@dynamic-labs/ethereum";
import { PropsWithChildren } from "react";
import { baseSepolia } from "wagmi/chains";

export function DynamicProvider({ children }: PropsWithChildren) {
  // Use Coinbase Developer RPC for better reliability
  const baseSepoliaRpcUrl =
    process.env.NEXT_PUBLIC_BASE_SEPOLIA_RPC_URL ?? 
    "https://api.developer.coinbase.com/rpc/v1/base-sepolia/f1PR0fXuOM3NcQ8IuI3U98AiaMzXv-Vl";
  const baseSepoliaRpcUrls = [baseSepoliaRpcUrl];

  return (
    <DynamicContextProvider
      settings={{
        environmentId: process.env.NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID ?? "72a36806-8ef5-493b-a51d-892532d784bc",
        walletConnectors: [
          (props) => EthereumWalletConnectors({ ...props, useMetamaskSdk: false }),
        ],
        overrides: {
          evmNetworks: [
            {
              blockExplorerUrls: baseSepolia.blockExplorers?.default?.url
                ? [baseSepolia.blockExplorers.default.url]
                : [],
              chainId: baseSepolia.id,
              iconUrls: [],
              name: baseSepolia.name,
              nativeCurrency: baseSepolia.nativeCurrency,
              networkId: baseSepolia.id,
              rpcUrls: baseSepoliaRpcUrls,
            },
          ],
        },
      }}
    >
      {children}
    </DynamicContextProvider>
  );
}


