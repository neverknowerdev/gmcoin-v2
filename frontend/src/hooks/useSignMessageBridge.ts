"use client";

import { useSignMessage } from "wagmi";
import { useMiniKit } from "@coinbase/onchainkit/minikit";
import { useDynamicContext } from "@dynamic-labs/sdk-react-core";
import { useMemo } from "react";

export function useSignMessageBridge() {
  const wagmiSignMessage = useSignMessage();
  const { context } = useMiniKit();
  const dynamicContext = useDynamicContext();

  const isMiniApp = useMemo(() => Boolean(context), [context]);

  if (isMiniApp) {
    return {
      signMessageAsync: wagmiSignMessage.signMessageAsync,
    };
  }

  const dynamicWallet = dynamicContext?.primaryWallet;

  if (dynamicWallet) {
    return {
      signMessageAsync: async ({ message }: { message: string }) => {
        const address =
          dynamicWallet.address ||
          (dynamicWallet as { chainAccounts?: { address?: string }[] })?.chainAccounts?.[0]
            ?.address;

        if (!address) {
          throw new Error("No address available in Dynamic wallet");
        }

        if (typeof (dynamicWallet as { getWalletClient?: () => Promise<any> }).getWalletClient === "function") {
          const walletClient = await (dynamicWallet as unknown as { getWalletClient: () => Promise<any> }).getWalletClient();
          if (walletClient && typeof walletClient.signMessage === "function") {
            return walletClient.signMessage({
              account: address as `0x${string}`,
              message,
            });
          }
        }

        const connector = dynamicWallet.connector as
          | { request?: (args: { method: string; params: unknown[] }) => Promise<string> }
          | { getProvider?: () => Promise<any>; provider?: any }
          | undefined;

        if (connector && typeof connector === "object" && "request" in connector && typeof connector.request === "function") {
          return connector.request({
            method: "personal_sign",
            params: [message, address],
          });
        }

        let provider: any;
        if (connector && "getProvider" in connector && typeof connector.getProvider === "function") {
          provider = await connector.getProvider?.();
        } else if (connector && "provider" in connector) {
          provider = (connector as { provider?: any }).provider;
        }

        if (provider && typeof provider.request === "function") {
          return provider.request({
            method: "personal_sign",
            params: [message, address],
          });
        }

        throw new Error("Unable to sign message with Dynamic wallet");
      },
    };
  }

  return {
    signMessageAsync: wagmiSignMessage.signMessageAsync,
  };
}


