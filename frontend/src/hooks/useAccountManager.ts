"use client";

import { useWriteContract, useWaitForTransactionReceipt, useWatchContractEvent, useChainId } from "wagmi";
import { useWalletConnection } from "./useWalletConnection";
import { ACCOUNT_MANAGER_ABI, ACCOUNT_MANAGER_ADDRESS } from "@/lib/contracts/accountManager";
import { useCallback, useEffect } from "react";
import { base } from "wagmi/chains";

const BASE_MAINNET_CHAIN_ID = base.id; // 8453

export function useAccountManager() {
  const { address } = useWalletConnection();
  const chainId = useChainId();
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash,
  });

  // Call canister after transaction is confirmed
  useEffect(() => {
    if (isConfirmed && hash && chainId) {
      const triggerCanisterEvent = async () => {
        try {
          console.log(`🔄 Triggering canister event processing for chain: ${chainId}, tx: ${hash}`);
          
          const response = await fetch("/api/canister/handle-event", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              chainId: chainId,
              transactionId: hash,
            }),
          });

          if (!response.ok) {
            const error = await response.json();
            console.error("❌ Failed to trigger canister event:", error);
            return;
          }

          const result = await response.json();
          console.log("✅ Canister event triggered successfully:", result);
        } catch (error) {
          console.error("❌ Error triggering canister event:", error);
          // Don't throw - this is a background operation
        }
      };

      triggerCanisterEvent();
    }
  }, [isConfirmed, hash, chainId]);

  // Validate chain before transactions
  const validateChain = useCallback(() => {
    if (chainId !== BASE_MAINNET_CHAIN_ID) {
      const errorMsg = `Wrong network! Please switch to Base Mainnet (Chain ID: ${BASE_MAINNET_CHAIN_ID}). Current chain: ${chainId}`;
      console.error("❌", errorMsg);
      throw new Error(errorMsg);
    }
  }, [chainId]);

  const requestTwitterVerification = useCallback(
    async (authCode: string, twitterID: string, tweetID: string) => {
      if (!address) {
        throw new Error("Wallet not connected");
      }

      // Validate chain before transaction
      validateChain();

      console.log("🔗 Chain ID:", chainId, "Expected:", BASE_MAINNET_CHAIN_ID);
      console.log("📝 Contract address:", ACCOUNT_MANAGER_ADDRESS);

      return writeContract({
        address: ACCOUNT_MANAGER_ADDRESS,
        abi: ACCOUNT_MANAGER_ABI,
        functionName: "requestTwitterVerificationByAuthCode",
        args: [authCode, BigInt(twitterID), tweetID],
        chainId: BASE_MAINNET_CHAIN_ID, // Explicitly set chain ID
      });
    },
    [address, writeContract, validateChain, chainId]
  );

  const requestFarcasterVerification = useCallback(
    async (farcasterFid: number) => {
      if (!address) {
        throw new Error("Wallet not connected");
      }

      // Validate chain before transaction
      validateChain();

      console.log("🔗 Chain ID:", chainId, "Expected:", BASE_MAINNET_CHAIN_ID);
      console.log("📝 Contract address:", ACCOUNT_MANAGER_ADDRESS);

      return writeContract({
        address: ACCOUNT_MANAGER_ADDRESS,
        abi: ACCOUNT_MANAGER_ABI,
        functionName: "requestFarcasterVerification",
        args: [BigInt(farcasterFid), address],
        chainId: BASE_MAINNET_CHAIN_ID, // Explicitly set chain ID
      });
    },
    [address, writeContract, validateChain, chainId]
  );

  return {
    requestTwitterVerification,
    requestFarcasterVerification,
    isPending,
    isConfirming,
    isConfirmed,
    error,
    hash,
    transactionHash: hash,
    chainId,
    isCorrectChain: chainId === BASE_MAINNET_CHAIN_ID,
  };
}

export function useVerificationEvents(
  onTwitterVerified?: (twitterID: string, wallet: string, isSuccess: boolean, errorMsg: string) => void,
  onFarcasterVerified?: (farcasterFid: string, wallet: string, isSuccess: boolean, errorMsg: string) => void
) {
  useWatchContractEvent({
    address: ACCOUNT_MANAGER_ADDRESS,
    abi: ACCOUNT_MANAGER_ABI,
    eventName: "TwitterVerificationResult",
    onLogs(logs) {
      logs.forEach((log) => {
        const { twitterID, wallet, isSuccess, errorMsg } = log.args;
        if (onTwitterVerified && twitterID && wallet) {
          onTwitterVerified(twitterID.toString(), wallet, isSuccess ?? false, errorMsg || "");
        }
      });
    },
  });

  useWatchContractEvent({
    address: ACCOUNT_MANAGER_ADDRESS,
    abi: ACCOUNT_MANAGER_ABI,
    eventName: "FarcasterVerificationResult",
    onLogs(logs) {
      logs.forEach((log) => {
        const { farcasterFid, wallet, isSuccess, errorMsg } = log.args;
        if (onFarcasterVerified && farcasterFid && wallet) {
          onFarcasterVerified(farcasterFid.toString(), wallet, isSuccess ?? false, errorMsg || "");
        }
      });
    },
  });
}

