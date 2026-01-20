"use client";

import { useReadContract, usePublicClient } from "wagmi";
import { useWalletConnection } from "@/hooks/useWalletConnection";
import { ACCOUNT_MANAGER_ABI, ACCOUNT_MANAGER_ADDRESS } from "@/lib/contracts/accountManager";
import { useState, useEffect, useCallback, useMemo } from "react";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { useMiniKit } from "@coinbase/onchainkit/minikit";
import { getExpectedChainId } from "@/lib/chains/config";

type VerificationStatusProps = {
  twitterId?: string;
  farcasterFid?: number;
};

export function VerificationStatus({ twitterId, farcasterFid }: VerificationStatusProps) {
  const { address } = useWalletConnection();
  const { context } = useMiniKit();
  const isMiniApp = useMemo(() => Boolean(context), [context]);
  const expectedChainId = useMemo(() => getExpectedChainId(isMiniApp), [isMiniApp]);
  const publicClient = usePublicClient({ chainId: expectedChainId });
  const [checkedTwitter, setCheckedTwitter] = useState(false);
  const [checkedFarcaster, setCheckedFarcaster] = useState(false);
  const [twitterTimeout, setTwitterTimeout] = useState(false);
  const [farcasterTimeout, setFarcasterTimeout] = useState(false);
  const [manualTwitterData, setManualTwitterData] = useState<any>(null);
  const [manualTwitterError, setManualTwitterError] = useState<string | null>(null);
  const [isManualLoading, setIsManualLoading] = useState(false);

  // Query Twitter verification
  const { 
    data: twitterUser, 
    isLoading: isLoadingTwitter,
    error: twitterError,
    refetch: refetchTwitter,
  } = useReadContract({
    address: ACCOUNT_MANAGER_ADDRESS,
    abi: ACCOUNT_MANAGER_ABI,
    functionName: "getUserByTwitterID",
    args: twitterId ? [BigInt(twitterId)] : undefined,
    chainId: expectedChainId,
    query: {
      enabled: !!twitterId && checkedTwitter && !!address && ACCOUNT_MANAGER_ADDRESS !== "0x0000000000000000000000000000000000000000",
      retry: 0, // Disable retries to fail faster
      retryOnMount: false,
      staleTime: 0, // Don't cache
      gcTime: 0, // Don't keep in cache
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
    },
  });

  // Query Farcaster verification
  const { 
    data: farcasterUser, 
    isLoading: isLoadingFarcaster,
    error: farcasterError,
    refetch: refetchFarcaster,
  } = useReadContract({
    address: ACCOUNT_MANAGER_ADDRESS,
    abi: ACCOUNT_MANAGER_ABI,
    functionName: "getUserByFarcasterFID",
    args: farcasterFid ? [BigInt(farcasterFid)] : undefined,
    chainId: expectedChainId,
    query: {
      enabled: !!farcasterFid && checkedFarcaster && !!address && ACCOUNT_MANAGER_ADDRESS !== "0x0000000000000000000000000000000000000000",
      retry: 0, // Disable retries to fail faster
      retryOnMount: false,
      staleTime: 0, // Don't cache
      gcTime: 0, // Don't keep in cache
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
    },
  });

  // Manual test function for Twitter
  const testTwitterManually = useCallback(async () => {
    if (!twitterId || !publicClient) return;
    
    setIsManualLoading(true);
    setManualTwitterError(null);
    setManualTwitterData(null);
    
    try {
      console.log("🧪 Manual test: Calling getUserByTwitterID directly...");
      const result = await publicClient.readContract({
        address: ACCOUNT_MANAGER_ADDRESS,
        abi: ACCOUNT_MANAGER_ABI,
        functionName: "getUserByTwitterID",
        args: [BigInt(twitterId)],
      });
      console.log("✅ Manual test success:", result);
      setManualTwitterData(result);
    } catch (error: any) {
      console.error("❌ Manual test error:", error);
      const errorMsg = error?.message || String(error);
      setManualTwitterError(errorMsg);
      // If it's a UserNotExist error, that's expected
      if (errorMsg.includes("UserNotExist") || errorMsg.includes("user does not exist")) {
        setManualTwitterData(null); // User doesn't exist, which is fine
      }
    } finally {
      setIsManualLoading(false);
    }
  }, [twitterId, publicClient]);

  // Timeout detection for Twitter query
  useEffect(() => {
    if (checkedTwitter && isLoadingTwitter && !twitterError && !twitterUser) {
      const timeout = setTimeout(() => {
        console.warn("⚠️ Twitter query timeout after 10 seconds");
        setTwitterTimeout(true);
      }, 10000); // 10 second timeout
      return () => clearTimeout(timeout);
    } else {
      setTwitterTimeout(false);
    }
  }, [checkedTwitter, isLoadingTwitter, twitterError, twitterUser]);

  // Timeout detection for Farcaster query
  useEffect(() => {
    if (checkedFarcaster && isLoadingFarcaster && !farcasterError && !farcasterUser) {
      const timeout = setTimeout(() => {
        console.warn("⚠️ Farcaster query timeout after 10 seconds");
        setFarcasterTimeout(true);
      }, 10000); // 10 second timeout
      return () => clearTimeout(timeout);
    } else {
      setFarcasterTimeout(false);
    }
  }, [checkedFarcaster, isLoadingFarcaster, farcasterError, farcasterUser]);

  // Debug logging (moved after hook declarations)
  useEffect(() => {
    if (checkedTwitter || checkedFarcaster) {
      console.log("🔍 VerificationStatus check:", {
        twitterId,
        farcasterFid,
        address,
        checkedTwitter,
        checkedFarcaster,
        contractAddress: ACCOUNT_MANAGER_ADDRESS,
        chainId: expectedChainId,
        twitterLoading: isLoadingTwitter,
        twitterTimeout,
        twitterError: twitterError ? {
          message: twitterError.message,
          name: twitterError.name,
          cause: twitterError.cause,
        } : undefined,
        twitterData: twitterUser,
        farcasterLoading: isLoadingFarcaster,
        farcasterTimeout,
        farcasterError: farcasterError ? {
          message: farcasterError.message,
          name: farcasterError.name,
          cause: farcasterError.cause,
        } : undefined,
        farcasterData: farcasterUser,
      });
    }
  }, [checkedTwitter, checkedFarcaster, twitterId, farcasterFid, address, isLoadingTwitter, isLoadingFarcaster, twitterError, farcasterError, twitterUser, farcasterUser, twitterTimeout, farcasterTimeout]);

  const isTwitterVerified = twitterUser && 
    twitterUser.primaryWallet?.toLowerCase() === address?.toLowerCase() &&
    twitterUser.twitterId?.toString() !== "0";

  const isFarcasterVerified = farcasterUser && 
    farcasterUser.primaryWallet?.toLowerCase() === address?.toLowerCase() &&
    farcasterUser.farcasterFid?.toString() !== "0";

  if (!address) {
    return null;
  }

  return (
    <div className="rounded-lg border border-white/30 bg-white/10 p-4 text-white backdrop-blur-xl">
      <h3 className="mb-3 font-semibold">Verification Status</h3>
      
      {twitterId && (
        <div className="mb-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm">Twitter</span>
            <button
              onClick={() => setCheckedTwitter(!checkedTwitter)}
              className="text-xs text-white/70 hover:text-white"
            >
              {checkedTwitter ? "Hide" : "Check"}
            </button>
          </div>
          {checkedTwitter && (
            <div className="pl-2 space-y-1">
              {isLoadingTwitter && !twitterTimeout ? (
                <div className="flex items-center gap-2 text-sm text-white/70">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Checking contract...
                </div>
              ) : twitterTimeout ? (
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm text-yellow-400">
                    <XCircle className="h-4 w-4" />
                    Query timeout
                  </div>
                  <p className="text-xs text-white/60">
                    The contract query is taking too long. This might indicate a network issue or the user doesn't exist.
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setTwitterTimeout(false);
                        refetchTwitter();
                      }}
                      className="text-xs text-blue-400 hover:text-blue-300 underline"
                    >
                      Retry Hook
                    </button>
                    <button
                      onClick={testTwitterManually}
                      disabled={isManualLoading}
                      className="text-xs text-green-400 hover:text-green-300 underline disabled:opacity-50"
                    >
                      {isManualLoading ? "Testing..." : "Test Direct Call"}
                    </button>
                  </div>
                  {manualTwitterError && (
                    <p className="text-xs text-red-400 mt-1">
                      Direct call error: {manualTwitterError}
                    </p>
                  )}
                  {manualTwitterData && (
                    <p className="text-xs text-green-400 mt-1">
                      Direct call success! User found.
                    </p>
                  )}
                </div>
              ) : twitterError ? (
                <div className="space-y-1">
                  {twitterError.message?.includes("UserNotExist") || 
                   twitterError.message?.includes("user does not exist") ||
                   twitterError.message?.includes("0x0e32af95") ? (
                    <>
                      <div className="flex items-center gap-2 text-sm text-yellow-400">
                        <XCircle className="h-4 w-4" />
                        Not verified yet
                      </div>
                      <p className="text-xs text-white/60">
                        User not found in contract. Verification may still be processing.
                      </p>
                      <button
                        onClick={() => refetchTwitter()}
                        className="text-xs text-blue-400 hover:text-blue-300 underline"
                      >
                        Refresh
                      </button>
                    </>
                  ) : (
                    <>
                      <div className="flex items-center gap-2 text-sm text-red-400">
                        <XCircle className="h-4 w-4" />
                        Error checking status
                      </div>
                      <p className="text-xs text-white/60">{twitterError.message || String(twitterError)}</p>
                      <button
                        onClick={() => refetchTwitter()}
                        className="text-xs text-blue-400 hover:text-blue-300 underline"
                      >
                        Retry
                      </button>
                    </>
                  )}
                </div>
              ) : isTwitterVerified ? (
                <div className="flex items-center gap-2 text-sm text-green-400">
                  <CheckCircle2 className="h-4 w-4" />
                  Verified ✅
                </div>
              ) : twitterUser ? (
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm text-yellow-400">
                    <XCircle className="h-4 w-4" />
                    Not verified yet
                  </div>
                  <p className="text-xs text-white/60">
                    Wallet: {twitterUser.primaryWallet?.slice(0, 6)}...{twitterUser.primaryWallet?.slice(-4)}
                  </p>
                  {twitterUser.primaryWallet?.toLowerCase() !== address?.toLowerCase() && (
                    <p className="text-xs text-red-400">Wallet mismatch!</p>
                  )}
                </div>
              ) : (
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm text-yellow-400">
                    <XCircle className="h-4 w-4" />
                    Not found in contract
                  </div>
                  <p className="text-xs text-white/60">
                    Verification may still be processing. Check back in a few minutes.
                  </p>
                  <button
                    onClick={() => refetchTwitter()}
                    className="text-xs text-blue-400 hover:text-blue-300 underline"
                  >
                    Refresh
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {farcasterFid && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm">Farcaster</span>
            <button
              onClick={() => setCheckedFarcaster(!checkedFarcaster)}
              className="text-xs text-white/70 hover:text-white"
            >
              {checkedFarcaster ? "Hide" : "Check"}
            </button>
          </div>
          {checkedFarcaster && (
            <div className="pl-2 space-y-1">
              {isLoadingFarcaster && !farcasterTimeout ? (
                <div className="flex items-center gap-2 text-sm text-white/70">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Checking contract...
                </div>
              ) : farcasterTimeout ? (
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm text-yellow-400">
                    <XCircle className="h-4 w-4" />
                    Query timeout
                  </div>
                  <p className="text-xs text-white/60">
                    The contract query is taking too long. This might indicate a network issue or the user doesn't exist.
                  </p>
                  <button
                    onClick={() => {
                      setFarcasterTimeout(false);
                      refetchFarcaster();
                    }}
                    className="text-xs text-blue-400 hover:text-blue-300 underline"
                  >
                    Retry
                  </button>
                </div>
              ) : farcasterError ? (
                <div className="space-y-1">
                  {farcasterError.message?.includes("UserNotExist") || 
                   farcasterError.message?.includes("user does not exist") ||
                   farcasterError.message?.includes("0x0e32af95") ? (
                    <>
                      <div className="flex items-center gap-2 text-sm text-yellow-400">
                        <XCircle className="h-4 w-4" />
                        Not verified yet
                      </div>
                      <p className="text-xs text-white/60">
                        User not found in contract. Verification may still be processing.
                      </p>
                      <button
                        onClick={() => refetchFarcaster()}
                        className="text-xs text-blue-400 hover:text-blue-300 underline"
                      >
                        Refresh
                      </button>
                    </>
                  ) : (
                    <>
                      <div className="flex items-center gap-2 text-sm text-red-400">
                        <XCircle className="h-4 w-4" />
                        Error checking status
                      </div>
                      <p className="text-xs text-white/60">{farcasterError.message || String(farcasterError)}</p>
                      <button
                        onClick={() => refetchFarcaster()}
                        className="text-xs text-blue-400 hover:text-blue-300 underline"
                      >
                        Retry
                      </button>
                    </>
                  )}
                </div>
              ) : isFarcasterVerified ? (
                <div className="flex items-center gap-2 text-sm text-green-400">
                  <CheckCircle2 className="h-4 w-4" />
                  Verified ✅
                </div>
              ) : farcasterUser ? (
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm text-yellow-400">
                    <XCircle className="h-4 w-4" />
                    Not verified yet
                  </div>
                  <p className="text-xs text-white/60">
                    Wallet: {farcasterUser.primaryWallet?.slice(0, 6)}...{farcasterUser.primaryWallet?.slice(-4)}
                  </p>
                  {farcasterUser.primaryWallet?.toLowerCase() !== address?.toLowerCase() && (
                    <p className="text-xs text-red-400">Wallet mismatch!</p>
                  )}
                </div>
              ) : (
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm text-yellow-400">
                    <XCircle className="h-4 w-4" />
                    Not found in contract
                  </div>
                  <p className="text-xs text-white/60">
                    Verification may still be processing. Check back in a few minutes.
                  </p>
                  <button
                    onClick={() => refetchFarcaster()}
                    className="text-xs text-blue-400 hover:text-blue-300 underline"
                  >
                    Refresh
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

