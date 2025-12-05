"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useMiniKit, useOpenUrl } from "@coinbase/onchainkit/minikit";
import { useSignIn, useProfile } from "@farcaster/auth-kit";
import { SocialActivity } from "@/components/stats/social-activity";
import { StreakCardNew } from "@/components/home/streak-card-new";
import { EngagementImpact } from "@/components/stats/engagement-impact";
import { AccountConnections } from "@/components/home/account-connections";
import { InviteFriendsCard } from "@/components/home/invite-friends-card";
import { LeaderboardCard } from "@/components/home/leaderboard-card";
import type { XProfile } from "@/types/social";

export default function SocialPage() {
  const { context } = useMiniKit();
  const openUrl = useOpenUrl();
  const [xConnection, setXConnection] = useState<XProfile | null>(null);

  // Farcaster SIWE hooks
  const { isConnected: isFarcasterConnectedFromHook } = useSignIn({});

  const { profile: farcasterProfile } = useProfile();

  const isFarcasterConnected =
    isFarcasterConnectedFromHook && Boolean(farcasterProfile);

  const isMiniApp = useMemo(() => Boolean(context), [context]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const refresh = async () => {
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
    };
    void refresh();
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const currentUrl = new URL(window.location.href);
    const param = currentUrl.searchParams.get("xAuth");
    if (!param) return;
    currentUrl.searchParams.delete("xAuth");
    window.history.replaceState(
      {},
      "",
      `${currentUrl.pathname}${currentUrl.search}${currentUrl.hash}`
    );
    const refresh = async () => {
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
    };
    void refresh();
  }, []);

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
  // Mock data - replace with real data later
  const streakData = [
    { day: "Su", completed: true, isToday: false },
    { day: "Mo", completed: true, isToday: false },
    { day: "Tu", completed: true, isToday: false },
    { day: "We", completed: true, isToday: false },
    { day: "Th", completed: false, isToday: false },
    { day: "Fr", completed: false, isToday: false },
    { day: "Sa", completed: false, isToday: true },
  ];

  const leaderboardEntries = [
    { rank: 1, name: "Name", amount: "100.567,8" },
    { rank: 2, name: "Name", amount: "100.567,8" },
    { rank: 3, name: "Name", amount: "100.567,8" },
    { rank: 4, name: "Name", amount: "100.567,8" },
    { rank: 5, name: "Name", amount: "100.567,8" },
  ];

  const userLeaderboardEntry = {
    rank: 888,
    name: "Name",
    amount: "100.567,8",
  };

  return (
    <div className="min-h-screen bg-white pb-32">
      <StreakCardNew streakDays={10} percentile={5} dayProgress={streakData} />
      <SocialActivity gmTweets="342" gmCasts="21" />
      <LeaderboardCard
        entries={leaderboardEntries}
        userEntry={userLeaderboardEntry}
        onViewFull={() => console.log("View full leaderboard")}
      />
      <EngagementImpact likesReceived="342" reports="21" />

      <AccountConnections
        xConnection={xConnection}
        isFarcasterConnected={isFarcasterConnected}
        onConnectX={handleConnectX}
        onConnectFarcaster={handleConnectFarcaster}
      />

      <InviteFriendsCard onInvite={() => console.log("Invite clicked")} />
    </div>
  );
}
