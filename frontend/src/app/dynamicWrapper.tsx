"use client";

import { useMiniKit } from "@coinbase/onchainkit/minikit";
import { DynamicContextProvider } from "@dynamic-labs/sdk-react-core";
import { ComponentProps, PropsWithChildren, useMemo } from "react";
import { DynamicProvider } from "./dynamicProvider";

type MinimalDynamicProviderProps = PropsWithChildren &
  Partial<ComponentProps<typeof DynamicContextProvider>>;

function MinimalDynamicProvider({ children }: MinimalDynamicProviderProps) {
  const envId = process.env.NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID ?? "72a36806-8ef5-493b-a51d-892532d784bc";

  return (
    <DynamicContextProvider
      settings={{
        environmentId: envId,
        walletConnectors: [],
        appName: "GMcoin Mini App",
        appLogoUrl: "",
      }}
    >
      {children}
    </DynamicContextProvider>
  );
}

export function DynamicWrapper({ children }: PropsWithChildren) {
  const { context } = useMiniKit();
  const isMiniApp = useMemo(() => Boolean(context), [context]);

  if (isMiniApp) {
    return <MinimalDynamicProvider>{children}</MinimalDynamicProvider>;
  }

  return <DynamicProvider>{children}</DynamicProvider>;
}


