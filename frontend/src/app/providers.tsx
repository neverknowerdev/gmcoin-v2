"use client";

import { SafeArea } from "@coinbase/onchainkit/minikit";
import { OnchainKitProvider } from "@coinbase/onchainkit";
import { PropsWithChildren } from "react";
import { baseSepolia } from "wagmi/chains";
import { AuthKitProvider } from "@farcaster/auth-kit";
import "@farcaster/auth-kit/styles.css";

export function Providers({ children }: PropsWithChildren) {
  // Use the RPC URL that already includes the API key
  const baseSepoliaRpcUrl =
    process.env.NEXT_PUBLIC_BASE_SEPOLIA_RPC_URL ?? "https://api.developer.coinbase.com/rpc/v1/base-sepolia/f1PR0fXuOM3NcQ8IuI3U98AiaMzXv-Vl";
  
  // Extract API key from RPC URL for OnchainKit
  // OnchainKit uses the API key to construct its RPC URLs, so we extract it from the provided URL
  const rpcApiKey = baseSepoliaRpcUrl.split('/').pop() || "";
  const apiKey = process.env.NEXT_PUBLIC_ONCHAINKIT_API_KEY ?? rpcApiKey;

  return (
    <AuthKitProvider
      config={{
        rpcUrl: baseSepoliaRpcUrl,
      }}
    >
      <OnchainKitProvider
        apiKey={apiKey}
        chain={baseSepolia}
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

