"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  useMiniKit,
  useOpenUrl,
} from "@coinbase/onchainkit/minikit";
import { ProfileInfo } from "@/components/profile/profile-info";
import { ProfileStats } from "@/components/profile/profile-stats";
import { AccountConnections } from "@/components/home/account-connections";
import { SettingsList } from "@/components/profile/settings-list";
import { ProfileActions } from "@/components/profile/profile-actions";
import type { XProfile, FarcasterProfile } from "@/types/social";
import { useUserBalance } from "@/hooks/useBalance";
import { useUserRank, useUserStreak } from "@/hooks/useUserStats";
import { useWalletConnection } from "@/hooks/useWalletConnection";

export default function ProfilePage() {
  const router = useRouter();
  const { context } = useMiniKit();
  const openUrl = useOpenUrl();
  const [notifications, setNotifications] = useState(true);
  const [xConnection, setXConnection] = useState<XProfile | null>(null);
  const [farcasterConnection, setFarcasterConnection] = useState<FarcasterProfile | null>(null);
  
  const isMiniApp = useMemo(() => Boolean(context), [context]);
  
  // Fetch real data
  const { address } = useWalletConnection();
  const { data: balanceData } = useUserBalance();
  const { rank } = useUserRank();
  const { streakDays } = useUserStreak();

  const username = useMemo(
    () => {
      // Prioritize X username if X account is connected
      if (xConnection?.username) {
        return xConnection.username;
      }
      // Then prioritize Farcaster username if Farcaster account is connected
      if (farcasterConnection?.username) {
        return farcasterConnection.username;
      }
      // Fallback to context username or default
      return context?.user?.username ?? "username";
    },
    [context?.user?.username, xConnection?.username, farcasterConnection?.username]
  );

  const gmId = useMemo(
    () => {
      if (context?.user?.fid) {
        return context.user.fid.toString().padStart(6, '0');
      }
      // Try to get user ID from API if wallet is connected
      if (address && balanceData) {
        // User exists, use a placeholder format (could be enhanced with actual user ID from API)
        return address.slice(2, 8).toUpperCase();
      }
      return "000000"; // Default placeholder
    },
    [context?.user?.fid, address, balanceData]
  );
  
  // Format balance
  const formatBalance = (bal?: string) => {
    if (!bal) return "0";
    const num = parseFloat(bal);
    if (isNaN(num)) return "0";
    return num.toLocaleString('en-US', { maximumFractionDigits: 0 });
  };
  
  // Format streak
  const formatStreak = (days?: number) => {
    if (!days || days === 0) return "0 days";
    return `${days} ${days === 1 ? 'day' : 'days'}`;
  };
  
  // Format rank
  const formatRank = (rankNum?: number) => {
    if (!rankNum) return "#--";
    return `#${rankNum}`;
  };


  useEffect(() => {
    if (typeof window === "undefined") return;
    const refreshX = async () => {
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
    const refreshFarcaster = async () => {
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
    };
    void refreshX();
    void refreshFarcaster();
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const currentUrl = new URL(window.location.href);
    const xAuthParam = currentUrl.searchParams.get("xAuth");
    const fcAuthParam = currentUrl.searchParams.get("fcAuth");
    
    if (xAuthParam) {
      currentUrl.searchParams.delete("xAuth");
      window.history.replaceState({}, "", `${currentUrl.pathname}${currentUrl.search}${currentUrl.hash}`);
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
    }
    
    if (fcAuthParam) {
      currentUrl.searchParams.delete("fcAuth");
      window.history.replaceState({}, "", `${currentUrl.pathname}${currentUrl.search}${currentUrl.hash}`);
      const refresh = async () => {
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
      };
      void refresh();
    }
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

  const handleDisconnectFarcaster = useCallback(async () => {
    try {
      // Remove from cookie
      const response = await fetch("/api/farcaster/disconnect", { method: "POST" });
      if (!response.ok) {
        throw new Error("Failed to disconnect");
      }
      // Clear local state immediately
      setFarcasterConnection(null);
      // Refresh to ensure state is synced
      const statusResponse = await fetch("/api/farcaster/status", { cache: "no-store" });
      if (statusResponse.ok) {
        const payload = (await statusResponse.json()) as {
          connected: boolean;
          profile?: FarcasterProfile;
        };
        setFarcasterConnection(payload.connected ? payload.profile ?? null : null);
      }
    } catch (error) {
      console.error("Unable to disconnect Farcaster account", error);
    }
  }, []);

  return (
    <div className="min-h-screen bg-white pb-32">
      <ProfileInfo 
        username={username} 
        gmId={gmId}
        profileImageUrl={xConnection?.profileImageUrl || farcasterConnection?.pfpUrl || null}
      />
      
      <ProfileStats
        balance={formatBalance(balanceData?.balance)}
        streak={formatStreak(streakDays)}
        rank={formatRank(rank)}
      />
      
      <div className="px-4 mb-6">
        <h2
          className="text-xl font-bold text-black mb-4"
          style={{ fontFamily: "var(--font-anton), sans-serif" }}
        >
          Connected accounts
        </h2>
        <AccountConnections
          xConnection={xConnection}
          farcasterConnection={farcasterConnection}
          onConnectX={handleConnectX}
          onDisconnectFarcaster={handleDisconnectFarcaster}
        />
      </div>
      
      <SettingsList
        notifications={notifications}
        onNotificationsToggle={setNotifications}
        onEpochHistory={() => router.push("/epoch-history")}
        onLanguage={() => console.log("Language clicked")}
        onAbout={() => console.log("About GM clicked")}
        onPrivacy={() => console.log("Privacy clicked")}
        onHelp={() => console.log("Help clicked")}
      />
      
      <ProfileActions
        onBackupWallet={() => console.log("Backup Wallet clicked")}
        onLogOut={() => console.log("Log Out clicked")}
      />
    </div>
  );
}

