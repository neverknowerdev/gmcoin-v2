"use client";

import { useEffect, useState } from "react";
import { useProfile } from "@farcaster/auth-kit";
import { useAccountManager, useVerificationEvents } from "./useAccountManager";
import { useWalletConnection } from "./useWalletConnection";

/**
 * Hook to handle Farcaster verification via SIWE
 * Triggers verification automatically when Farcaster sign-in completes
 */
export function useFarcasterSIWE() {
  const { profile, isAuthenticated } = useProfile();
  const { address } = useWalletConnection();
  const { requestFarcasterVerification, hash, isConfirmed, error: txError } = useAccountManager();
  const [verificationStatus, setVerificationStatus] = useState<{
    status: "idle" | "pending" | "success" | "error";
    error?: string;
    txHash?: string;
  }>({ status: "idle" });
  const [hasTriggered, setHasTriggered] = useState(false);

  useEffect(() => {
    // Only trigger once when Farcaster is authenticated and we have both FID and wallet
    if (
      isAuthenticated &&
      profile?.fid &&
      address &&
      !hasTriggered &&
      verificationStatus.status === "idle"
    ) {
      const triggerVerification = async () => {
        try {
          setHasTriggered(true);
          setVerificationStatus({ status: "pending" });

          // Use the connected wallet address
          // The Gelato W3F will verify this matches the FID's primary wallet
          if (!address) {
            throw new Error("No wallet address available for verification");
          }

          // Call the contract to request verification
          // The contract function will use the connected wallet (msg.sender)
          console.log("🔄 Requesting Farcaster verification for FID:", profile.fid, "Wallet:", address);
          const result = await requestFarcasterVerification(profile.fid);
          console.log("✅ Farcaster verification transaction submitted:", result);
          
          // Update status with transaction hash if available
          setVerificationStatus({ 
            status: "pending",
            txHash: hash || undefined,
          });
          
          if (hash) {
            console.log("📝 Transaction hash:", hash);
            console.log("🔗 View on BaseScan:", `https://basescan.org/tx/${hash}`);
          }
        } catch (error) {
          console.error("❌ Farcaster SIWE verification failed:", error);
          setVerificationStatus({
            status: "error",
            error: error instanceof Error ? error.message : "Unknown error",
          });
          setHasTriggered(false); // Allow retry
        }
      };

      triggerVerification();
    }
  }, [
    isAuthenticated,
    profile?.fid,
    address,
    hasTriggered,
    verificationStatus.status,
    requestFarcasterVerification,
  ]);

  // Reset when user disconnects
  useEffect(() => {
    if (!isAuthenticated) {
      setHasTriggered(false);
      setVerificationStatus({ status: "idle" });
    }
  }, [isAuthenticated]);

  // Listen for verification result events
  useVerificationEvents(
    undefined, // Twitter handler not needed here
    (farcasterFid, wallet, isSuccess, errorMsg) => {
      console.log("📨 Farcaster verification event received:", { farcasterFid, wallet, isSuccess, errorMsg });
      // Only update if this event is for our FID and wallet
      if (
        profile?.fid &&
        farcasterFid === profile.fid.toString() &&
        wallet.toLowerCase() === address?.toLowerCase()
      ) {
        if (isSuccess) {
          console.log("✅ Farcaster verification successful!");
          setVerificationStatus({ status: "success" });
        } else {
          console.error("❌ Farcaster verification failed:", errorMsg);
          setVerificationStatus({
            status: "error",
            error: errorMsg || "Verification failed",
          });
          setHasTriggered(false); // Allow retry on error
        }
      } else {
        console.log("⚠️ Event not for this user:", {
          eventFid: farcasterFid,
          ourFid: profile?.fid?.toString(),
          eventWallet: wallet,
          ourWallet: address,
        });
      }
    }
  );

  // Update status when transaction is confirmed
  useEffect(() => {
    if (isConfirmed && verificationStatus.status === "pending") {
      console.log("✅ Transaction confirmed! Waiting for Gelato to process verification...");
    }
  }, [isConfirmed, verificationStatus.status]);

  // Log transaction errors
  useEffect(() => {
    if (txError) {
      console.error("❌ Transaction error:", txError);
      setVerificationStatus({
        status: "error",
        error: txError.message || "Transaction failed",
      });
      setHasTriggered(false);
    }
  }, [txError]);

  return {
    verificationStatus,
    isVerifying: verificationStatus.status === "pending",
    txHash: verificationStatus.txHash || hash,
    isConfirmed,
  };
}

