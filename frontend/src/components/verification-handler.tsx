"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useAccountManager, useVerificationEvents } from "@/hooks/useAccountManager";
import { useWalletConnection } from "@/hooks/useWalletConnection";
import type { XProfile } from "@/types/social";
import type { FarcasterProfile } from "@/types/social";

export function VerificationHandler() {
  const searchParams = useSearchParams();
  const { address, isConnected } = useWalletConnection();
  const { requestTwitterVerification, requestFarcasterVerification } = useAccountManager();
  const [twitterProfile, setTwitterProfile] = useState<XProfile | null>(null);
  const [farcasterProfile, setFarcasterProfile] = useState<FarcasterProfile | null>(null);
  const [verificationStatus, setVerificationStatus] = useState<{
    twitter?: "pending" | "success" | "error";
    farcaster?: "pending" | "success" | "error";
  }>({});

  // Load Twitter profile from API (cookies are httpOnly)
  useEffect(() => {
    if (typeof window === "undefined") return;

    const loadTwitterProfile = async () => {
      try {
        const response = await fetch("/api/x/status", { cache: "no-store" });
        if (response.ok) {
          const data = await response.json() as { connected: boolean; profile?: XProfile };
          if (data.connected && data.profile) {
            setTwitterProfile(data.profile);
          }
        }
      } catch (error) {
        console.error("Failed to load Twitter profile", error);
      }
    };

    void loadTwitterProfile();
  }, []);

  // Handle Twitter verification - UI will handle the tweet posting flow
  // This component just listens for events

  // Load Farcaster profile from API (for OAuth flow)
  // Note: SIWE flow is handled by useFarcasterSIWE hook in welcome-card
  useEffect(() => {
    if (typeof window === "undefined") return;

    const loadFarcasterProfile = async () => {
      try {
        const response = await fetch("/api/farcaster/status", { cache: "no-store" });
        if (response.ok) {
          const data = await response.json() as { connected: boolean; profile?: FarcasterProfile };
          if (data.connected && data.profile) {
            setFarcasterProfile(data.profile);
          }
        }
      } catch (error) {
        // Status endpoint might not be available, that's OK
        console.debug("Farcaster status endpoint not available");
      }
    };

    void loadFarcasterProfile();
  }, []);

  // Handle Farcaster verification via OAuth (non-SIWE flow)
  // Note: SIWE flow is handled by useFarcasterSIWE hook in welcome-card
  useEffect(() => {
    const fcAuth = searchParams.get("fcAuth");
    if (fcAuth === "connected" && farcasterProfile && address && isConnected) {
      const handleVerification = async () => {
        try {
          setVerificationStatus((prev) => ({ ...prev, farcaster: "pending" }));
          await requestFarcasterVerification(farcasterProfile.fid);
          // Status will be updated via event listener
        } catch (error) {
          console.error("Farcaster verification request failed", error);
          setVerificationStatus((prev) => ({ ...prev, farcaster: "error" }));
        }
      };
      handleVerification();
    }
  }, [searchParams, farcasterProfile, address, isConnected, requestFarcasterVerification]);

  // Listen for verification events
  useVerificationEvents(
    (twitterID, wallet, isSuccess, errorMsg) => {
      console.log("📨 Twitter verification event:", { twitterID, wallet, isSuccess, errorMsg });
      if (wallet.toLowerCase() === address?.toLowerCase()) {
        console.log("✅ Twitter verification event matches our wallet!");
        setVerificationStatus((prev) => ({
          ...prev,
          twitter: isSuccess ? "success" : "error",
        }));
        if (isSuccess) {
          console.log("🎉 Twitter verification successful!");
        } else {
          console.error("❌ Twitter verification failed:", errorMsg);
        }
      } else {
        console.log("⚠️ Twitter event not for this wallet:", { eventWallet: wallet, ourWallet: address });
      }
    },
    (farcasterFid, wallet, isSuccess, errorMsg) => {
      console.log("📨 Farcaster verification event:", { farcasterFid, wallet, isSuccess, errorMsg });
      if (wallet.toLowerCase() === address?.toLowerCase()) {
        console.log("✅ Farcaster verification event matches our wallet!");
        setVerificationStatus((prev) => ({
          ...prev,
          farcaster: isSuccess ? "success" : "error",
        }));
        if (isSuccess) {
          console.log("🎉 Farcaster verification successful!");
        } else {
          console.error("❌ Farcaster verification failed:", errorMsg);
        }
      } else {
        console.log("⚠️ Farcaster event not for this wallet:", { eventWallet: wallet, ourWallet: address });
      }
    }
  );

  return null; // This component doesn't render anything
}

