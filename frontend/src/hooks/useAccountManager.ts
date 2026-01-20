"use client";

import { useWriteContract, useWaitForTransactionReceipt, useWatchContractEvent, useChainId } from "wagmi";
import { useWalletConnection } from "./useWalletConnection";
import { ACCOUNT_MANAGER_ABI, ACCOUNT_MANAGER_ADDRESS } from "@/lib/contracts/accountManager";
import { useCallback, useMemo } from "react";
import { useMiniKit } from "@coinbase/onchainkit/minikit";
import { getExpectedChainId, getExpectedChainName } from "@/lib/chains/config";

export function useAccountManager() {
  const { address } = useWalletConnection();
  const chainId = useChainId();
  const { context } = useMiniKit();
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash,
  });

  // Determine if we're in mini-app
  const isMiniApp = useMemo(() => Boolean(context), [context]);

  // Get expected chain ID based on environment
  const expectedChainId = useMemo(() => getExpectedChainId(isMiniApp), [isMiniApp]);
  const expectedChainName = useMemo(() => getExpectedChainName(isMiniApp), [isMiniApp]);

  // Validate chain before transactions
  const validateChain = useCallback(() => {
    if (chainId !== expectedChainId) {
      const errorMsg = `Wrong network! Please switch to ${expectedChainName} (Chain ID: ${expectedChainId}). Current chain: ${chainId}`;
      console.error("❌", errorMsg);
      throw new Error(errorMsg);
    }
  }, [chainId, expectedChainId, expectedChainName]);

  const requestTwitterVerification = useCallback(
    async (authCode: string, twitterID: string, tweetID: string) => {
      if (!address) {
        throw new Error("Wallet not connected");
      }

      // Validate chain before transaction
      validateChain();

      console.log("🔗 Chain ID:", chainId, "Expected:", expectedChainId);
      console.log("📝 Contract address:", ACCOUNT_MANAGER_ADDRESS);

      return writeContract({
        address: ACCOUNT_MANAGER_ADDRESS,
        abi: ACCOUNT_MANAGER_ABI,
        functionName: "requestTwitterVerificationByAuthCode",
        args: [authCode, BigInt(twitterID), tweetID],
        chainId: expectedChainId, // Explicitly set chain ID
      });
    },
    [address, writeContract, validateChain, chainId, expectedChainId]
  );

  const requestFarcasterVerification = useCallback(
    async (farcasterFid: number) => {
      if (!address) {
        throw new Error("Wallet not connected");
      }

      // Validate chain before transaction
      validateChain();

      console.log("🔗 Chain ID:", chainId, "Expected:", expectedChainId);
      console.log("📝 Contract address:", ACCOUNT_MANAGER_ADDRESS);

      return writeContract({
        address: ACCOUNT_MANAGER_ADDRESS,
        abi: ACCOUNT_MANAGER_ABI,
        functionName: "requestFarcasterVerification",
        args: [BigInt(farcasterFid), address],
        chainId: expectedChainId, // Explicitly set chain ID
      });
    },
    [address, writeContract, validateChain, chainId, expectedChainId]
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
    expectedChainId,
    expectedChainName,
    isCorrectChain: chainId === expectedChainId,
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
          onTwitterVerified(twitterID.toString(), wallet, isSuccess, errorMsg || "");
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
          onFarcasterVerified(farcasterFid.toString(), wallet, isSuccess, errorMsg || "");
        }
      });
    },
  });
}

