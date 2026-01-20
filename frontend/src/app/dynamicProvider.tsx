"use client";

import { DynamicContextProvider } from "@dynamic-labs/sdk-react-core";
import { EthereumWalletConnectors } from "@dynamic-labs/ethereum";
import { PropsWithChildren } from "react";
import { getBrowserChain, getRpcUrl } from "@/lib/chains/config";

export function DynamicProvider({ children }: PropsWithChildren) {
  // Get the target chain for browser wallet (Base or Worldchain, Mainnet or Sepolia)
  const targetChain = getBrowserChain();
  const rpcUrl = getRpcUrl(false); // false = isBrowser
  const rpcUrls = [rpcUrl];

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
              blockExplorerUrls: targetChain.blockExplorers?.default?.url
                ? [targetChain.blockExplorers.default.url]
                : [],
              chainId: targetChain.id,
              iconUrls: [],
              name: targetChain.name,
              nativeCurrency: targetChain.nativeCurrency,
              networkId: targetChain.id,
              rpcUrls: rpcUrls,
            },
          ],
        },
      }}
    >
      {children}
    </DynamicContextProvider>
  );
}


