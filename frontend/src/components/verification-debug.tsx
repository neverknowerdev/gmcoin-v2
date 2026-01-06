"use client";

import { useWalletConnection } from "@/hooks/useWalletConnection";
import { useVerificationStatus } from "@/hooks/useVerificationStatus";
import { useReadContract } from "wagmi";
import { ACCOUNT_MANAGER_ABI, ACCOUNT_MANAGER_ADDRESS } from "@/lib/contracts/accountManager";
import { useState } from "react";

export function VerificationDebug() {
  const { address, isConnected } = useWalletConnection();
  const [twitterId, setTwitterId] = useState("");
  const [farcasterFid, setFarcasterFid] = useState("");

  // Query user by wallet address (if we can find userId)
  const { data: twitterUser } = useReadContract({
    address: ACCOUNT_MANAGER_ADDRESS,
    abi: ACCOUNT_MANAGER_ABI,
    functionName: "getUserByTwitterID",
    args: twitterId ? [BigInt(twitterId)] : undefined,
    query: {
      enabled: !!twitterId,
    },
  });

  const { data: farcasterUser } = useReadContract({
    address: ACCOUNT_MANAGER_ADDRESS,
    abi: ACCOUNT_MANAGER_ABI,
    functionName: "getUserByFarcasterFID",
    args: farcasterFid ? [BigInt(farcasterFid)] : undefined,
    query: {
      enabled: !!farcasterFid,
    },
  });

  if (!isConnected || !address) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-md rounded-lg border border-white/30 bg-black/90 p-4 text-xs text-white backdrop-blur-xl">
      <h3 className="mb-2 font-bold">🔍 Verification Debug</h3>
      <div className="space-y-2">
        <div>
          <p className="text-white/70">Wallet: {address.slice(0, 6)}...{address.slice(-4)}</p>
        </div>
        <div>
          <label className="block text-white/70 mb-1">Check Twitter ID:</label>
          <input
            type="text"
            value={twitterId}
            onChange={(e) => setTwitterId(e.target.value)}
            placeholder="Enter Twitter ID"
            className="w-full rounded bg-white/10 px-2 py-1 text-white placeholder-white/50"
          />
          {twitterUser && (
            <div className="mt-1 text-green-400">
              ✅ Found: Wallet {twitterUser.primaryWallet?.slice(0, 6)}...{twitterUser.primaryWallet?.slice(-4)}
              {twitterUser.primaryWallet?.toLowerCase() === address.toLowerCase() && " (Matches!)"}
            </div>
          )}
        </div>
        <div>
          <label className="block text-white/70 mb-1">Check Farcaster FID:</label>
          <input
            type="text"
            value={farcasterFid}
            onChange={(e) => setFarcasterFid(e.target.value)}
            placeholder="Enter Farcaster FID"
            className="w-full rounded bg-white/10 px-2 py-1 text-white placeholder-white/50"
          />
          {farcasterUser && (
            <div className="mt-1 text-green-400">
              ✅ Found: Wallet {farcasterUser.primaryWallet?.slice(0, 6)}...{farcasterUser.primaryWallet?.slice(-4)}
              {farcasterUser.primaryWallet?.toLowerCase() === address.toLowerCase() && " (Matches!)"}
            </div>
          )}
        </div>
        <div className="pt-2 border-t border-white/20">
          <p className="text-white/70 text-[10px]">
            💡 Check browser console for detailed logs
          </p>
        </div>
      </div>
    </div>
  );
}

