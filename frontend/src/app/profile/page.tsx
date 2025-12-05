"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  useMiniKit,
  useOpenUrl,
} from "@coinbase/onchainkit/minikit";
import { useSignIn, useProfile } from "@farcaster/auth-kit";
import { ProfileInfo } from "@/components/profile/profile-info";
import { ProfileStats } from "@/components/profile/profile-stats";
import { AccountConnections } from "@/components/home/account-connections";
import { SettingsList } from "@/components/profile/settings-list";
import { ProfileActions } from "@/components/profile/profile-actions";
import type { XProfile } from "@/types/social";

export default function ProfilePage() {
  const router = useRouter();
  const { context } = useMiniKit();
  const openUrl = useOpenUrl();
  const [notifications, setNotifications] = useState(true);
  const [xConnection, setXConnection] = useState<XProfile | null>(null);
  
  // Farcaster SIWE hooks
  const {
    isConnected: isFarcasterConnectedFromHook,
  } = useSignIn({});
  
  const { profile: farcasterProfile } = useProfile();
  
  const isFarcasterConnected = isFarcasterConnectedFromHook && Boolean(farcasterProfile);
  
  const isMiniApp = useMemo(() => Boolean(context), [context]);

  const username = useMemo(
    () => context?.user?.username ?? "username",
    [context?.user?.username]
  );

  const gmId = useMemo(
    () => {
      if (context?.user?.fid) {
        return context.user.fid.toString().padStart(6, '0');
      }
      return "024939"; // Default mock ID
    },
    [context?.user?.fid]
  );


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
      <ProfileInfo username={username} gmId={gmId} />
      
      <ProfileStats
        balance="342,457"
        streak="10 days"
        rank="#888"
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
          isFarcasterConnected={isFarcasterConnected}
          onConnectX={handleConnectX}
          onConnectFarcaster={handleConnectFarcaster}
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

