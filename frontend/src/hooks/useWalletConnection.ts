"use client";

import { useAccount } from "wagmi";
import { useMiniKit } from "@coinbase/onchainkit/minikit";
import { useDynamicContext } from "@dynamic-labs/sdk-react-core";
import { useMemo } from "react";

export function useWalletConnection() {
  const wagmiAccount = useAccount();
  const { context } = useMiniKit();
  const dynamicContext = useDynamicContext();

  const isMiniApp = useMemo(() => Boolean(context), [context]);

  if (isMiniApp) {
    return wagmiAccount;
  }

  const dynamicWallet = dynamicContext?.primaryWallet;

  if (dynamicWallet) {
    const walletAddress =
      dynamicWallet.address ||
      (dynamicWallet as { chainAccounts?: { address?: string }[] })?.chainAccounts?.[0]
        ?.address;

    if (walletAddress) {
      return {
        ...wagmiAccount,
        address: walletAddress as `0x${string}`,
        isConnected: true,
        isConnecting: false,
        isDisconnected: false,
        status: "connected" as const,
      };
    }
  }

  return wagmiAccount;
}


