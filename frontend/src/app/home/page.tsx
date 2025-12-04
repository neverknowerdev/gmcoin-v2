"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  useMiniKit,
  useAuthenticate,
  useOpenUrl,
} from "@coinbase/onchainkit/minikit";
import { useSignIn, useProfile } from "@farcaster/auth-kit";
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
import type { XProfile } from "@/types/social";

export default function HomePage() {
  const { context, setMiniAppReady } = useMiniKit();
  const { signIn } = useAuthenticate(
    process.env.NEXT_PUBLIC_MINIAPP_DOMAIN || undefined,
    false
  );
  const openUrl = useOpenUrl();
  const { address, isConnected } = useWalletConnection();
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [xConnection, setXConnection] = useState<XProfile | null>(null);
  const [showTwitterVerification, setShowTwitterVerification] = useState(false);
  
  // Farcaster SIWE hooks
  const {
    isConnected: isFarcasterConnectedFromHook,
  } = useSignIn({});
  
  const { profile: farcasterProfile } = useProfile();
  
  const isFarcasterConnected = isFarcasterConnectedFromHook && Boolean(farcasterProfile);
  
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

    if (xConnection?.name) {
      return xConnection.name;
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
    // Show verification modal if X is connected and wallet is connected
    if (param === "connected" && isConnected && address) {
      setShowTwitterVerification(true);
    }
  }, [refreshXConnection, isConnected, address]);

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

  if (!isMiniApp && !isConnected) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-6 px-6 text-center">
        <Image
          src="/images/gmCup2.svg"
          alt="GM mascot"
          width={120}
          height={120}
          className="drop-shadow-2xl"
          priority
        />
        <div className="space-y-2">
          <p className="text-xl font-semibold text-white">
            Connect your wallet to continue
          </p>
          <p className="text-sm text-white/70">
            We need a connected wallet to personalize your GMcoin experience.
          </p>
        </div>
        <DynamicConnectButton
          buttonClassName="w-full max-w-xs cursor-pointer rounded-3xl border border-white/40 bg-white/10 px-6 py-3 text-sm font-semibold text-white shadow-lg backdrop-blur"
        >
          Connect Wallet
        </DynamicConnectButton>
      </div>
    );
  }

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
    <div className="">
      <BalanceSection
        balance="32,822 GM"
        onHistory={() => console.log("History clicked")}
        onHowToEarn={() => console.log("How to earn clicked")}
      />
      
      <div className="space-y-4">
        <StreakCardNew
          streakDays={10}
          percentile={5}
          dayProgress={streakData}
        />
        
        <AccountConnections
          xConnection={xConnection}
          isFarcasterConnected={isFarcasterConnected}
          onConnectX={handleConnectX}
          onConnectFarcaster={handleConnectFarcaster}
        />
        
        <LeaderboardCard
          entries={leaderboardEntries}
          userEntry={userLeaderboardEntry}
          onViewFull={() => console.log("View full leaderboard")}
        />
        
        <InviteFriendsCard
          onInvite={() => console.log("Invite clicked")}
        />
        
        <EpochCard
          epochNumber={12}
          currentDay={4}
          totalDays={7}
          mintingDifficulty="100 GM"
          onHowItWorks={() => console.log("How it works clicked")}
          onViewHistory={() => console.log("View epoch history")}
        />
        
        <TokenizationCardNew
          percentage={80}
          growthToday={12}
          historical={[45, 62, 55, 68, 57, 66, 70, 75, 80]}
          onViewStats={() => console.log("View detailed statistics")}
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

