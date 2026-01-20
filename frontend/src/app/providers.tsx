"use client";

import { SafeArea } from "@coinbase/onchainkit/minikit";
import { OnchainKitProvider } from "@coinbase/onchainkit";
import { PropsWithChildren } from "react";
import { AuthKitProvider } from "@farcaster/auth-kit";
import "@farcaster/auth-kit/styles.css";
import { getMiniAppChain, getRpcUrl } from "@/lib/chains/config";

export function Providers({ children }: PropsWithChildren) {
  // Get the target chain for mini-app (Base Mainnet or Base Sepolia)
  const targetChain = getMiniAppChain();
  const rpcUrl = getRpcUrl(true); // true = isMiniApp

  // Extract API key from RPC URL for OnchainKit if it's a Coinbase Developer URL
  // OnchainKit uses the API key to construct its RPC URLs, so we extract it from the provided URL
  const rpcApiKey = rpcUrl.includes("/rpc/v1/") ? rpcUrl.split('/').pop() || "" : "";
  const apiKey = process.env.NEXT_PUBLIC_ONCHAINKIT_API_KEY ?? rpcApiKey;

  return (
    <AuthKitProvider
      config={{
        rpcUrl: rpcUrl,
      }}
    >
      <OnchainKitProvider
        apiKey={apiKey}
        chain={targetChain}
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

