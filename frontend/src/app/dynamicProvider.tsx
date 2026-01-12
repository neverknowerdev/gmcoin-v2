"use client";

import { DynamicContextProvider } from "@dynamic-labs/sdk-react-core";
import { EthereumWalletConnectors } from "@dynamic-labs/ethereum";
import { PropsWithChildren } from "react";
import { base } from "wagmi/chains";

export function DynamicProvider({ children }: PropsWithChildren) {
  // Use Base Mainnet RPC URL
  const baseMainnetRpcUrl =
    process.env.NEXT_PUBLIC_BASE_MAINNET_RPC_URL ?? 
    process.env.NEXT_PUBLIC_BASE_RPC_URL ??
    "https://mainnet.base.org";
  const baseMainnetRpcUrls = [baseMainnetRpcUrl];

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
              blockExplorerUrls: base.blockExplorers?.default?.url
                ? [base.blockExplorers.default.url]
                : [],
              chainId: base.id,
              iconUrls: [],
              name: base.name,
              nativeCurrency: base.nativeCurrency,
              networkId: base.id,
              rpcUrls: baseMainnetRpcUrls,
            },
          ],
        },
      }}
    >
      {children}
    </DynamicContextProvider>
  );
}


