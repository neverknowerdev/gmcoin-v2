"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useAccountManager, useVerificationEvents } from "@/hooks/useAccountManager";
import { useWalletConnection } from "@/hooks/useWalletConnection";
import { generateTwitterAuthCode } from "@/lib/twitter-auth-code";
import { deserializeProfile } from "@/lib/client/x-oauth";
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

  // Load profiles from cookies
  useEffect(() => {
    if (typeof window === "undefined") return;

    // Load Twitter profile
    const xProfileCookie = document.cookie
      .split("; ")
      .find((row) => row.startsWith("x_profile="));
    if (xProfileCookie) {
      const profileValue = decodeURIComponent(xProfileCookie.split("=").slice(1).join("="));
      const profile = deserializeProfile(profileValue);
      if (profile) setTwitterProfile(profile);
    }

    // Load Farcaster profile
    const fcProfileCookie = document.cookie
      .split("; ")
      .find((row) => row.startsWith("fc_profile="));
    if (fcProfileCookie) {
      try {
        const profileValue = decodeURIComponent(fcProfileCookie.split("=").slice(1).join("="));
        const profile = JSON.parse(profileValue) as FarcasterProfile;
        setFarcasterProfile(profile);
      } catch (e) {
        console.error("Failed to parse Farcaster profile", e);
      }
    }
  }, []);

  // Handle Twitter verification - UI will handle the tweet posting flow
  // This component just listens for events

  // Handle Farcaster verification via OAuth (legacy flow)
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
      if (wallet.toLowerCase() === address?.toLowerCase()) {
        setVerificationStatus((prev) => ({
          ...prev,
          twitter: isSuccess ? "success" : "error",
        }));
        if (!isSuccess) {
          console.error("Twitter verification failed:", errorMsg);
        }
      }
    },
    (farcasterFid, wallet, isSuccess, errorMsg) => {
      if (wallet.toLowerCase() === address?.toLowerCase()) {
        setVerificationStatus((prev) => ({
          ...prev,
          farcaster: isSuccess ? "success" : "error",
        }));
        if (!isSuccess) {
          console.error("Farcaster verification failed:", errorMsg);
        }
      }
    }
  );

  return null; // This component doesn't render anything
}

