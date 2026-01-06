"use client";

import { useReadContract } from "wagmi";
import { useWalletConnection } from "./useWalletConnection";
import { ACCOUNT_MANAGER_ABI, ACCOUNT_MANAGER_ADDRESS } from "@/lib/contracts/accountManager";
import { useEffect, useState } from "react";

export function useVerificationStatus() {
  const { address } = useWalletConnection();
  const [twitterId, setTwitterId] = useState<string | null>(null);
  const [farcasterFid, setFarcasterFid] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Query user by Twitter ID if we have one
  const { data: twitterUser, isLoading: isLoadingTwitter } = useReadContract({
    address: ACCOUNT_MANAGER_ADDRESS,
    abi: ACCOUNT_MANAGER_ABI,
    functionName: "getUserByTwitterID",
    args: twitterId ? [BigInt(twitterId)] : undefined,
    query: {
      enabled: !!twitterId && !!address,
    },
  });

  // Query user by Farcaster FID if we have one
  const { data: farcasterUser, isLoading: isLoadingFarcaster } = useReadContract({
    address: ACCOUNT_MANAGER_ADDRESS,
    abi: ACCOUNT_MANAGER_ABI,
    functionName: "getUserByFarcasterFID",
    args: farcasterFid ? [BigInt(farcasterFid)] : undefined,
    query: {
      enabled: !!farcasterFid && !!address,
    },
  });

  // Check if the returned user's wallet matches connected wallet
  const isTwitterVerified = twitterUser && 
    twitterUser.primaryWallet?.toLowerCase() === address?.toLowerCase() &&
    twitterUser.twitterId?.toString() !== "0";

  const isFarcasterVerified = farcasterUser && 
    farcasterUser.primaryWallet?.toLowerCase() === address?.toLowerCase() &&
    farcasterUser.farcasterFid?.toString() !== "0";

  return {
    isTwitterVerified: !!isTwitterVerified,
    isFarcasterVerified: !!isFarcasterVerified,
    twitterUser,
    farcasterUser,
    isLoading: isLoadingTwitter || isLoadingFarcaster || isLoading,
    error,
    checkTwitterVerification: (id: string) => {
      setTwitterId(id);
      setError(null);
    },
    checkFarcasterVerification: (fid: string) => {
      setFarcasterFid(fid);
      setError(null);
    },
    clearChecks: () => {
      setTwitterId(null);
      setFarcasterFid(null);
      setError(null);
    },
  };
}

