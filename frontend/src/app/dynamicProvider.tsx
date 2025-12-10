"use client";

import { DynamicContextProvider } from "@dynamic-labs/sdk-react-core";
import { EthereumWalletConnectors } from "@dynamic-labs/ethereum";
import { PropsWithChildren } from "react";
import { base } from "wagmi/chains";

export function DynamicProvider({ children }: PropsWithChildren) {
  const defaultHttp = base.rpcUrls.default.http;
  const baseRpcUrls = (
    Array.isArray(defaultHttp) ? defaultHttp : [defaultHttp]
  ).map((url) => url.toString());

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
              rpcUrls: baseRpcUrls,
            },
          ],
        },
      }}
    >
      {children}
    </DynamicContextProvider>
  );
}


