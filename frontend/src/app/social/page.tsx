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
import { useLeaderboard } from "@/hooks/useLeaderboard";
import { useUserRank, useUserStreak } from "@/hooks/useUserStats";
import { useUserTransactions } from "@/hooks/useTransactions";
import { useWalletConnection } from "@/hooks/useWalletConnection";

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
  
  // Fetch real data
  const { address } = useWalletConnection();
  const { data: leaderboardData = [] } = useLeaderboard(100);
  const { streakDays, weekProgress: streakData } = useUserStreak();
  const { data: transactions = [] } = useUserTransactions();
  
  // Calculate social activity stats from transactions
  const socialStats = useMemo(() => {
    const gmTweets = transactions.filter(
      (tx) => tx.platform === "twitter" && tx.type === "minting"
    ).length;
    const gmCasts = transactions.filter(
      (tx) => tx.platform === "farcaster" && tx.type === "minting"
    ).length;
    return { gmTweets, gmCasts };
  }, [transactions]);
  
  // Get top 5 leaderboard entries
  const leaderboardEntries = leaderboardData.slice(0, 5).map((entry) => ({
    rank: entry.rank,
    name: entry.wallet.slice(0, 6) + "..." + entry.wallet.slice(-4),
    amount: parseFloat(entry.balance).toLocaleString('en-US', { maximumFractionDigits: 2 }),
  }));
  
  // Find user's position in leaderboard
  const userEntry = address
    ? leaderboardData.find((entry) => entry.wallet.toLowerCase() === address.toLowerCase())
    : null;
  
  const userLeaderboardEntry = userEntry
    ? {
        rank: userEntry.rank,
        name: userEntry.wallet.slice(0, 6) + "..." + userEntry.wallet.slice(-4),
        amount: parseFloat(userEntry.balance).toLocaleString('en-US', { maximumFractionDigits: 2 }),
      }
    : undefined;

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

  return (
    <div className="min-h-screen bg-white pb-32">
      <StreakCardNew streakDays={streakDays} percentile={5} dayProgress={streakData} />
      <SocialActivity gmTweets={socialStats.gmTweets.toString()} gmCasts={socialStats.gmCasts.toString()} />
      <LeaderboardCard
        entries={leaderboardEntries}
        userEntry={userLeaderboardEntry}
        onViewFull={() => console.log("View full leaderboard")}
      />
      <EngagementImpact likesReceived="0" reports="0" />

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
