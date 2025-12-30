"use client";

import { useState, useEffect } from "react";
import { useAccountManager, useVerificationEvents } from "@/hooks/useAccountManager";
import { generateTwitterAuthCode } from "@/lib/twitter-auth-code";
import { useWalletConnection } from "@/hooks/useWalletConnection";
import type { XProfile } from "@/types/social";

type TwitterVerificationModalProps = {
  profile: XProfile;
  onClose: () => void;
  onSuccess: () => void;
};

export function TwitterVerificationModal({
  profile,
  onClose,
  onSuccess,
}: TwitterVerificationModalProps) {
  const { address } = useWalletConnection();
  const { requestTwitterVerification, isPending, hash, isConfirmed, error: txError, isCorrectChain, chainId } = useAccountManager();
  const [tweetID, setTweetID] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [verificationStatus, setVerificationStatus] = useState<{
    status: "pending" | "success" | "error";
    message?: string;
  } | null>(null);

  // Listen for verification result events
  useVerificationEvents(
    (twitterID, wallet, isSuccess, errorMsg) => {
      // Only handle events for this specific Twitter ID and wallet
      if (twitterID === profile.id && wallet.toLowerCase() === address?.toLowerCase()) {
        if (isSuccess) {
          setVerificationStatus({ status: "success", message: "Twitter account verified successfully!" });
          console.log("✅ Twitter verification successful!");
          // Close modal and call onSuccess after a short delay
          setTimeout(() => {
            onSuccess();
            onClose();
          }, 2000);
        } else {
          setVerificationStatus({ status: "error", message: errorMsg || "Verification failed" });
          console.error("❌ Twitter verification failed:", errorMsg);
        }
      }
    },
    undefined // No Farcaster handler needed here
  );

  // Update txHash when hash changes
  useEffect(() => {
    if (hash) {
      setTxHash(hash);
    }
  }, [hash]);

  if (!address) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
        <div className="glass rounded-xl border border-white/30 bg-white/10 p-6 text-white backdrop-blur-xl">
          <p>Please connect your wallet first</p>
          <button onClick={onClose} className="mt-4 rounded-lg bg-white/20 px-4 py-2">
            Close
          </button>
        </div>
      </div>
    );
  }

  const authCode = generateTwitterAuthCode(address);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!tweetID.trim()) {
      setError("Please enter a tweet ID");
      return;
    }

    // Check chain before submitting
    if (!isCorrectChain) {
      setError(`Wrong network! Please switch to Base Sepolia. Current chain: ${chainId}`);
      return;
    }

    try {
      const result = await requestTwitterVerification(authCode, profile.id, tweetID.trim());
      console.log("✅ Twitter verification transaction submitted:", result);
      if (hash) {
        setTxHash(hash);
        console.log("📝 Transaction hash:", hash);
        console.log("🔗 View on BaseScan:", `https://basescan.org/tx/${hash}`);
      }
      // Don't call onSuccess immediately - wait for confirmation
    } catch (err) {
      console.error("❌ Twitter verification failed:", err);
      const errorMessage = err instanceof Error ? err.message : "Failed to submit verification";
      setError(errorMessage);
      
      // If it's a chain error, provide helpful message
      if (errorMessage.includes("network") || errorMessage.includes("chain")) {
        setError(`${errorMessage}. Please switch to Base Sepolia in your wallet.`);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="glass max-w-md rounded-xl border border-white/30 bg-white/10 p-6 text-white backdrop-blur-xl">
        <h2 className="mb-4 text-xl font-bold">Verify Your Twitter Account</h2>
        <p className="mb-4 text-sm text-white/80">
          To verify your Twitter account, please follow these steps:
        </p>
        <ol className="mb-4 list-decimal space-y-2 pl-5 text-sm">
          <li>Post a tweet with the following verification code:</li>
        </ol>
        <div className="mb-4 rounded-lg bg-white/10 p-3 font-mono text-center text-lg font-bold">
          {authCode}
        </div>
        <p className="mb-4 text-sm text-white/80">
          Copy the code above and post it in a tweet. Then paste the tweet ID below.
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="tweetID" className="mb-2 block text-sm font-semibold">
              Tweet ID
            </label>
            <input
              id="tweetID"
              type="text"
              value={tweetID}
              onChange={(e) => setTweetID(e.target.value)}
              placeholder="Enter the tweet ID"
              className="w-full rounded-lg border border-white/30 bg-white/5 px-4 py-2 text-white placeholder-white/50 focus:border-white/50 focus:outline-none"
              disabled={isPending}
            />
            <p className="mt-1 text-xs text-white/60">
              You can find the tweet ID in the tweet URL: twitter.com/username/status/TWEET_ID
            </p>
          </div>
          {txHash && (
            <div className="rounded-lg bg-blue-500/20 p-3 text-sm text-blue-200">
              <p className="font-semibold">✅ Transaction submitted!</p>
              <p className="text-xs mt-1 break-all">Hash: {txHash}</p>
              <a
                href={`https://basescan.org/tx/${txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs underline mt-1 block"
              >
                View on BaseScan →
              </a>
              {isConfirmed && !verificationStatus && (
                <p className="text-xs mt-1 text-green-300">✅ Transaction confirmed! Waiting for Gelato to verify...</p>
              )}
              {verificationStatus?.status === "success" && (
                <p className="text-xs mt-1 text-green-300">✅ {verificationStatus.message}</p>
              )}
              {verificationStatus?.status === "error" && (
                <p className="text-xs mt-1 text-red-300">❌ {verificationStatus.message}</p>
              )}
            </div>
          )}
          {txError && (
            <div className="rounded-lg bg-red-500/20 p-3 text-sm text-red-200">
              Transaction error: {txError.message || String(txError)}
            </div>
          )}
          {error && (
            <div className="rounded-lg bg-red-500/20 p-3 text-sm text-red-200">{error}</div>
          )}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border border-white/30 bg-white/10 px-4 py-2 transition hover:bg-white/20"
              disabled={isPending}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 rounded-lg bg-white/20 px-4 py-2 font-semibold transition hover:bg-white/30 disabled:opacity-50"
              disabled={isPending || !tweetID.trim()}
            >
              {isPending ? "Submitting..." : "Submit Verification"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

