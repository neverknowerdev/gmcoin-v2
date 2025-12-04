"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  useMiniKit,
  useOpenUrl,
} from "@coinbase/onchainkit/minikit";
import { useSignIn, useProfile } from "@farcaster/auth-kit";
import { SocialActivity } from "@/components/stats/social-activity";
import { EngagementImpact } from "@/components/stats/engagement-impact";
import { AccountConnections } from "@/components/home/account-connections";
import { InviteFriendsCard } from "@/components/home/invite-friends-card";
import type { XProfile } from "@/types/social";

export default function SocialPage() {
  const { context } = useMiniKit();
  const openUrl = useOpenUrl();
  const [xConnection, setXConnection] = useState<XProfile | null>(null);
  
  // Farcaster SIWE hooks
  const {
    isConnected: isFarcasterConnectedFromHook,
  } = useSignIn({});
  
  const { profile: farcasterProfile } = useProfile();
  
  const isFarcasterConnected = isFarcasterConnectedFromHook && Boolean(farcasterProfile);
  
  const isMiniApp = useMemo(() => Boolean(context), [context]);

  const refreshXConnection = useCallback(async () => {
    try {
      const response = await fetch("/api/x/status", { cache: "no-store" });
      if (!response.ok) return;
      const payload = (await response.json()) as {
        connected: boolean;
        profile?: XProfile;
      };
      setXConnection(payload.connected ? payload.profile ?? null : null);
    } catch (error) {
      console.error("Unable to load X auth status", error);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    void refreshXConnection();
  }, [refreshXConnection]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const currentUrl = new URL(window.location.href);
    const param = currentUrl.searchParams.get("xAuth");
    if (!param) return;
    currentUrl.searchParams.delete("xAuth");
    window.history.replaceState({}, "", `${currentUrl.pathname}${currentUrl.search}${currentUrl.hash}`);
    void refreshXConnection();
  }, [refreshXConnection]);

  const handleConnectX = useCallback(() => {
    const targetPath = "/api/x/connect";
    if (isMiniApp) {
      if (typeof window !== "undefined") {
        void openUrl(`${window.location.origin}${targetPath}`);
      }
      return;
    }
    if (typeof window !== "undefined") {
      window.open(targetPath, "_blank", "noopener,noreferrer");
    }
  }, [isMiniApp, openUrl]);

  const handleConnectFarcaster = useCallback(() => {
    const targetPath = "/api/farcaster/connect";
    if (isMiniApp) {
      if (typeof window !== "undefined") {
        void openUrl(`${window.location.origin}${targetPath}`);
      }
      return;
    }
    if (typeof window !== "undefined") {
      window.open(targetPath, "_blank", "noopener,noreferrer");
    }
  }, [isMiniApp, openUrl]);

  return (
    <div className="min-h-screen bg-white pb-32">
      <SocialActivity
        gmTweets="342"
        gmCasts="21"
      />
      
      <EngagementImpact
        likesReceived="342"
        reports="21"
      />
      
      <AccountConnections
        xConnection={xConnection}
        isFarcasterConnected={isFarcasterConnected}
        onConnectX={handleConnectX}
        onConnectFarcaster={handleConnectFarcaster}
      />
      
      <InviteFriendsCard
        onInvite={() => console.log("Invite clicked")}
      />
    </div>
  );
}

