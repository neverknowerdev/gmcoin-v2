"use client";

import { useWriteContract, useWaitForTransactionReceipt, useWatchContractEvent } from "wagmi";
import { useWalletConnection } from "./useWalletConnection";
import { ACCOUNT_MANAGER_ABI, ACCOUNT_MANAGER_ADDRESS } from "@/lib/contracts/accountManager";
import { useCallback } from "react";

export function useAccountManager() {
  const { address } = useWalletConnection();
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash,
  });

  const requestTwitterVerification = useCallback(
    async (authCode: string, twitterID: string, tweetID: string) => {
      if (!address) {
        throw new Error("Wallet not connected");
      }

      return writeContract({
        address: ACCOUNT_MANAGER_ADDRESS,
        abi: ACCOUNT_MANAGER_ABI,
        functionName: "requestTwitterVerificationByAuthCode",
        args: [authCode, BigInt(twitterID), tweetID],
      });
    },
    [address, writeContract]
  );

  const requestFarcasterVerification = useCallback(
    async (farcasterFid: number) => {
      if (!address) {
        throw new Error("Wallet not connected");
      }

      return writeContract({
        address: ACCOUNT_MANAGER_ADDRESS,
        abi: ACCOUNT_MANAGER_ABI,
        functionName: "requestFarcasterVerification",
        args: [BigInt(farcasterFid), address],
      });
    },
    [address, writeContract]
  );

  return {
    requestTwitterVerification,
    requestFarcasterVerification,
    isPending,
    isConfirming,
    isConfirmed,
    error,
    hash,
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

