"use client";

import { useAccountManager } from "@/hooks/useAccountManager";
import { useWalletConnection } from "@/hooks/useWalletConnection";
import { useSwitchChain } from "wagmi";
import { AlertTriangle } from "lucide-react";
import { useEffect } from "react";

export function ChainWarning() {
  const { isCorrectChain, chainId, expectedChainId, expectedChainName } = useAccountManager();
  const { isConnected } = useWalletConnection();
  const { switchChain, isPending: isSwitching } = useSwitchChain();

  // Log chain info for debugging
  useEffect(() => {
    if (isConnected) {
      console.log("🔗 Current chain ID:", chainId, "Expected:", expectedChainId, `(${expectedChainName})`);
      if (!isCorrectChain) {
        console.warn(`⚠️ Wrong network detected! Please switch to ${expectedChainName}`);
      }
    }
  }, [isConnected, chainId, isCorrectChain, expectedChainId, expectedChainName]);

  if (!isConnected || isCorrectChain) {
    return null;
  }

  const handleSwitch = () => {
    try {
      switchChain({ chainId: expectedChainId });
    } catch (error) {
      console.error("Failed to switch chain:", error);
    }
  };

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 max-w-md mx-4">
      <div className="rounded-lg border border-red-500/50 bg-red-500/20 p-4 text-white backdrop-blur-xl shadow-lg">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-red-400 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm">Wrong Network!</p>
            <p className="text-xs text-white/80 mt-1">
              Please switch to {expectedChainName} (Chain ID: {expectedChainId})
            </p>
            <p className="text-xs text-white/60 mt-1 break-all">
              Current: Chain ID {chainId}
            </p>
            <p className="text-xs text-white/60 mt-1">
              Contract is deployed on {expectedChainName} only
            </p>
          </div>
          <button
            onClick={handleSwitch}
            disabled={isSwitching}
            className="rounded-lg bg-red-500/80 px-3 py-1.5 text-xs font-semibold hover:bg-red-500 transition disabled:opacity-50 flex-shrink-0"
          >
            {isSwitching ? "Switching..." : "Switch"}
          </button>
        </div>
      </div>
    </div>
  );
}

