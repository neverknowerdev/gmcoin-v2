"use client";

import { SafeArea } from "@coinbase/onchainkit/minikit";
import { OnchainKitProvider } from "@coinbase/onchainkit";
import { PropsWithChildren } from "react";
import { chain } from "@/config/chains";
import { AuthKitProvider } from "@farcaster/auth-kit";
import "@farcaster/auth-kit/styles.css";
import "@coinbase/onchainkit/styles.css";

export function Providers({ children }: PropsWithChildren) {
  // Use Base Mainnet RPC URL
  const baseMainnetRpcUrl =
    process.env.NEXT_PUBLIC_BASE_MAINNET_RPC_URL ?? 
    process.env.NEXT_PUBLIC_BASE_RPC_URL ??
    "https://mainnet.base.org";
  
  // Extract API key from RPC URL for OnchainKit if using Coinbase RPC
  // OnchainKit uses the API key to construct its RPC URLs
  const rpcApiKey = baseMainnetRpcUrl.includes('/rpc/v1/base/') 
    ? baseMainnetRpcUrl.split('/').pop() || ""
    : "";
  const apiKey = process.env.NEXT_PUBLIC_ONCHAINKIT_API_KEY ?? rpcApiKey;

  // Get domain for AuthKit
  const appDomain = process.env.NEXT_PUBLIC_APP_DOMAIN || 
    (typeof window !== "undefined" ? window.location.hostname : "localhost");
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 
    (typeof window !== "undefined" ? window.location.origin : "http://localhost:3000");

  return (
    <AuthKitProvider
      config={{
        domain: appDomain,
        siweUri: `${appUrl}`,
        rpcUrl: baseMainnetRpcUrl,
        relay: "https://relay.farcaster.xyz",
      }}
    >
      <OnchainKitProvider
        apiKey={apiKey}
        chain={chain}
        config={{
          appearance: {
            name: process.env.NEXT_PUBLIC_ONCHAINKIT_PROJECT_NAME || "GMcoin Mini App",
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

