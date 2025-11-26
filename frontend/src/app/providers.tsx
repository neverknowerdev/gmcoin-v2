"use client";

import { SafeArea } from "@coinbase/onchainkit/minikit";
import { OnchainKitProvider } from "@coinbase/onchainkit";
import { PropsWithChildren } from "react";
import { base } from "wagmi/chains";
import { AuthKitProvider } from "@farcaster/auth-kit";
import "@farcaster/auth-kit/styles.css";

export function Providers({ children }: PropsWithChildren) {
  const apiKey = process.env.NEXT_PUBLIC_ONCHAINKIT_API_KEY ?? "";
  const optimismRpcUrl =
    process.env.NEXT_PUBLIC_OP_MAINNET_RPC_URL ?? "https://mainnet.optimism.io";

  return (
    <AuthKitProvider
      config={{
        rpcUrl: optimismRpcUrl,
      }}
    >
      <OnchainKitProvider
        apiKey={apiKey}
        chain={base}
        autoConnect={false}
        config={{
          appearance: {
            name: "GMcoin Mini App",
          },
        }}
        miniKit={{
          enabled: true,
          autoConnect: false,
        }}
      >
        <SafeArea>
          <div className="min-h-screen bg-background text-foreground">
            {children}
          </div>
        </SafeArea>
      </OnchainKitProvider>
    </AuthKitProvider>
  );
}

