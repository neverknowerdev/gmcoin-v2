"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  useMiniKit,
  useAuthenticate,
  useOpenUrl,
} from "@coinbase/onchainkit/minikit";
import { useSignIn } from "@farcaster/auth-kit";
import { BalanceSection } from "@/components/home/balance-section";
import { StreakCardNew } from "@/components/home/streak-card-new";
import { AccountConnections } from "@/components/home/account-connections";
import { LeaderboardCard } from "@/components/home/leaderboard-card";
import { InviteFriendsCard } from "@/components/home/invite-friends-card";
import { EpochCard } from "@/components/home/epoch-card";
import { TokenizationCardNew } from "@/components/home/tokenization-card-new";
import { TwitterVerificationModal } from "@/components/twitter-verification-modal";
import { VerificationStatus } from "@/components/verification-status";
import { useWalletConnection } from "@/hooks/useWalletConnection";
import { DynamicConnectButton } from "@dynamic-labs/sdk-react-core";
import type { XProfile, FarcasterProfile } from "@/types/social";
import { useUserBalance } from "@/hooks/useBalance";
import { useLeaderboard } from "@/hooks/useLeaderboard";
import { useCurrentEpoch } from "@/hooks/useEpochs";
import { useGlobalStats, useDailyStats } from "@/hooks/useStats";
import { useUserStreak } from "@/hooks/useUserStats";

export default function HomePage() {
  const router = useRouter();
  const { context, setMiniAppReady } = useMiniKit();
  const { signIn } = useAuthenticate(
    process.env.NEXT_PUBLIC_MINIAPP_DOMAIN || undefined,
    false
  );
  const openUrl = useOpenUrl();
  const { address, isConnected } = useWalletConnection();
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [xConnection, setXConnection] = useState<XProfile | null>(null);
  const [farcasterConnection, setFarcasterConnection] = useState<FarcasterProfile | null>(null);
  const [showTwitterVerification, setShowTwitterVerification] = useState(false);

  // Fetch real data
  const { data: balanceData } = useUserBalance();
  const { data: leaderboardData = [] } = useLeaderboard(100);
  const { data: currentEpoch } = useCurrentEpoch();
  const { data: globalStats } = useGlobalStats();
  const { data: dailyStats = [] } = useDailyStats(7);
  const { streakDays, weekProgress: streakData } = useUserStreak();

  // Format balance
  const formatBalance = (bal?: string) => {
    if (!bal) return "0 GM";
    const num = parseFloat(bal);
    if (isNaN(num)) return "0 GM";
    return `${num.toLocaleString('en-US', { maximumFractionDigits: 2 })} GM`;
  };

  // Get top 5 leaderboard entries
  const leaderboardEntries = leaderboardData.slice(0, 5).map((entry) => ({
    rank: entry.rank,
    name: entry.wallet.slice(0, 6) + "..." + entry.wallet.slice(-4), // Truncate wallet address
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
    void setMiniAppReady();
  }, [setMiniAppReady]);

  const isMiniApp = useMemo(() => Boolean(context), [context]);

  const truncateAddress = (value?: string | null) => {
    if (!value) return "wallet not connected";
    return `${value.slice(0, 6)}…${value.slice(-4)}`;
  };

  const displayName = useMemo(() => {
    if (isMiniApp) {
      return context?.user?.displayName ?? context?.user?.username ?? "Friend";
    }

    // Prioritize X username when X account is connected
    if (xConnection?.username) {
      return xConnection.username;
    }

    // Then prioritize Farcaster username when Farcaster account is connected
    if (farcasterConnection?.username) {
      return farcasterConnection.username;
    }

    if (xConnection?.name) {
      return xConnection.name;
    }

    if (farcasterConnection?.displayName) {
      return farcasterConnection.displayName;
    }

    if (isConnected && address) {
      return "GMcoin user";
    }

    return "Friend";
  }, [
    address,
    context?.user?.displayName,
    context?.user?.username,
    isConnected,
    isMiniApp,
    xConnection?.name,
    xConnection?.username,
    farcasterConnection?.username,
    farcasterConnection?.displayName,
  ]);

  const custodyAddress = useMemo(
    () =>
      (context?.user as { custodyAddress?: string | null } | undefined)
        ?.custodyAddress ?? null,
    [context?.user]
  );

  const addressLabel = useMemo(() => {
    if (isMiniApp) {
      if (context?.user?.fid) {
        return `fid:${context.user.fid}`;
      }
      if (custodyAddress) {
        return truncateAddress(custodyAddress);
      }
    }

    if (isConnected && address) {
      return truncateAddress(address);
    }

    return "wallet not connected";
  }, [address, custodyAddress, context?.user?.fid, isConnected, isMiniApp]);

  const isVerified = useMemo(() => {
    if (isMiniApp) {
      return Boolean(context?.user?.fid);
    }

    return Boolean(isConnected && address);
  }, [address, context?.user?.fid, isConnected, isMiniApp]);

  const handleSignIn = async () => {
    if (!isMiniApp || isAuthenticating) return;
    setIsAuthenticating(true);
    try {
      await signIn();
    } catch (error) {
      console.error("Sign-in rejected", error);
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleExternalLink = useCallback(
    (target: string) => {
      if (!target) return;
      if (isMiniApp) {
        void openUrl(target);
        return;
      }
      if (typeof window !== "undefined") {
        window.open(target, "_blank", "noopener,noreferrer");
      }
    },
    [isMiniApp, openUrl]
  );

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

  const refreshFarcasterConnection = useCallback(async () => {
    try {
      const response = await fetch("/api/farcaster/status", { cache: "no-store" });
      if (!response.ok) return;
      const payload = (await response.json()) as {
        connected: boolean;
        profile?: FarcasterProfile;
      };
      setFarcasterConnection(payload.connected ? payload.profile ?? null : null);
    } catch (error) {
      console.error("Unable to load Farcaster auth status", error);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    void refreshXConnection();
    void refreshFarcasterConnection();
  }, [refreshXConnection, refreshFarcasterConnection]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const currentUrl = new URL(window.location.href);
    const xAuthParam = currentUrl.searchParams.get("xAuth");
    const fcAuthParam = currentUrl.searchParams.get("fcAuth");
    
    if (xAuthParam) {
      currentUrl.searchParams.delete("xAuth");
      window.history.replaceState({}, "", `${currentUrl.pathname}${currentUrl.search}${currentUrl.hash}`);
      void refreshXConnection();
      // Show verification modal if X is connected and wallet is connected
      if (xAuthParam === "connected" && isConnected && address) {
        setShowTwitterVerification(true);
      }
    }
    
    if (fcAuthParam) {
      currentUrl.searchParams.delete("fcAuth");
      window.history.replaceState({}, "", `${currentUrl.pathname}${currentUrl.search}${currentUrl.hash}`);
      void refreshFarcasterConnection();
    }
  }, [refreshXConnection, refreshFarcasterConnection, isConnected, address]);

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

  const handleDisconnectX = useCallback(async () => {
    try {
      const response = await fetch("/api/x/disconnect", { method: "POST" });
      if (!response.ok) {
        throw new Error("Failed to disconnect");
      }
      console.log("✅ X account disconnected successfully");
      // Clear local state immediately
      setXConnection(null);
    } catch (error) {
      console.error("❌ Unable to disconnect X account", error);
    } finally {
      // Refresh to ensure state is synced
      void refreshXConnection();
    }
  }, [refreshXConnection]);

  // Farcaster AuthKit sign-in
  const {
    connect: farcasterConnect,
    signIn: farcasterSignIn,
    signOut: farcasterSignOut,
    isConnected: isFarcasterAuthConnected,
  } = useSignIn({
    onSuccess: async ({ fid, username, displayName, pfpUrl }) => {
      // Store profile in cookie after successful sign-in
      try {
        const response = await fetch("/api/farcaster/store", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            fid,
            username,
            displayName,
            pfpUrl,
          }), 
        });

        if (response.ok) {
          // Refresh Farcaster connection status
          await refreshFarcasterConnection();
        }
      } catch (error) {
        console.error("Failed to store Farcaster profile:", error);
      }
    },
  });

  const handleConnectFarcaster = useCallback(() => {
    try {
      // Connect first, then sign in
      farcasterConnect();
      // Sign in after a short delay to allow connection to establish
      setTimeout(() => {
        farcasterSignIn();
      }, 200);
    } catch (error) {
      console.error("Error connecting to Farcaster:", error);
    }
  }, [farcasterConnect, farcasterSignIn]);

  const handleDisconnectFarcaster = useCallback(async () => {
    try {
      // Sign out from AuthKit first
      farcasterSignOut();
      
      // Then remove from cookie
      const response = await fetch("/api/farcaster/disconnect", { method: "POST" });
      if (!response.ok) {
        throw new Error("Failed to disconnect");
      }
      console.log("✅ Farcaster account disconnected successfully");
      // Clear local state immediately
      setFarcasterConnection(null);
    } catch (error) {
      console.error("❌ Unable to disconnect Farcaster account", error);
    } finally {
      // Refresh to ensure state is synced
      await refreshFarcasterConnection();
    }
  }, [farcasterSignOut, refreshFarcasterConnection]);

  if (!isMiniApp && !isConnected) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-4">
        <div className="mx-4 w-full max-w-md rounded-2xl bg-white p-6 shadow-sm">
          <div className="flex flex-col items-center gap-4 text-center">
            <Image
              src="/images/gmCup2.svg"
              alt="GM mascot"
              width={100}
              height={100}
              className="flex-shrink-0"
              priority
            />
            <div className="space-y-2">
              <p className="text-2xl font-bold text-black" style={{ fontFamily: "var(--font-anton), sans-serif" }}>
                Connect your wallet
              </p>
              <p className="text-sm text-gray-600">
                We need a connected wallet to personalize your GMcoin experience.
              </p>
            </div>
            <div className="w-full pt-2">
              <DynamicConnectButton
                buttonClassName="w-full cursor-pointer rounded-full bg-[#84D65B] px-6 py-3 text-sm font-medium text-black hover:bg-[#6fb84a] transition shadow-sm"
              >
                Connect Wallet
              </DynamicConnectButton>
            </div>
          </div>
        </div>
      </div>
    );
  }


  // Calculate growth and percentage for tokenization card
  const calculateGrowth = () => {
    if (dailyStats.length < 2) return 0;
    const today = dailyStats[dailyStats.length - 1];
    const yesterday = dailyStats[dailyStats.length - 2];
    if (yesterday === 0) return 0;
    return Math.round(((today - yesterday) / yesterday) * 100);
  };

  const calculateTotalPercentage = () => {
    if (!globalStats) return 0;
    const total = parseFloat(globalStats.totalTokenized);
    return Math.min(100, Math.round((total / 1000000) * 100));
  };

  return (
    <div className="">
      <BalanceSection
        balance={formatBalance(balanceData?.balance)}
        onHistory={() => router.push("/history")}
        onHowToEarn={() => console.log("How to earn clicked")}
      />
      
      <div className="space-y-4">
        <StreakCardNew
          streakDays={streakDays}
          percentile={5}
          dayProgress={streakData}
        />
        
        <AccountConnections
          xConnection={xConnection}
          farcasterConnection={farcasterConnection}
          onConnectX={handleConnectX}
          onDisconnectX={handleDisconnectX}
          onDisconnectFarcaster={handleDisconnectFarcaster}
        />
        
        <LeaderboardCard
          entries={leaderboardEntries}
          userEntry={userLeaderboardEntry}
          onViewFull={() => console.log("View full leaderboard")}
        />
        
        <InviteFriendsCard
          onInvite={() => console.log("Invite clicked")}
        />
        
        {currentEpoch && (
        <EpochCard
            epochNumber={currentEpoch.epochNumber}
            currentDay={currentEpoch.currentDay}
            totalDays={currentEpoch.totalDays}
            mintingDifficulty={currentEpoch.mintingDifficulty}
          onHowItWorks={() => console.log("How it works clicked")}
          onViewHistory={() => router.push("/epoch-history")}
        />
        )}
        
        <TokenizationCardNew
          percentage={calculateTotalPercentage()}
          growthToday={calculateGrowth()}
          historical={dailyStats.map(d => Math.round(d))}
          onViewStats={() => router.push("/stats")}
        />
      </div>
      
      {showTwitterVerification && xConnection && (
        <TwitterVerificationModal
          profile={xConnection}
          onClose={() => setShowTwitterVerification(false)}
          onSuccess={() => {
            setShowTwitterVerification(false);
            void refreshXConnection();
          }}
        />
      )}
      {(xConnection || context?.user?.fid) && (
        <VerificationStatus
          twitterId={xConnection?.id}
          farcasterFid={context?.user?.fid}
        />
      )}
    </div>
  );
}

