"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  useMiniKit,
  useAuthenticate,
  useOpenUrl,
} from "@coinbase/onchainkit/minikit";
import { WelcomeCard } from "./home/welcome-card";
import { BalanceCard } from "./home/balance-card";
import { TokenizationCard } from "./home/tokenization-card";
import { StreakCard } from "./home/streak-card";
import { DifficultyCard } from "./home/difficulty-card";
import { TwitterVerificationModal } from "./twitter-verification-modal";
import { useWalletConnection } from "@/hooks/useWalletConnection";
import { getFarcasterProfileUrl } from "@/lib/social-links";
import { DynamicConnectButton } from "@dynamic-labs/sdk-react-core";
import type { XProfile } from "@/types/social";

export function MiniAppHome() {
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
      await fetch("/api/x/disconnect", { method: "POST" });
    } catch (error) {
      console.error("Unable to disconnect X account", error);
    } finally {
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

  return (
    <div className="relative flex min-h-screen flex-col justify-between px-4 pb-24 pt-8">
        <Image
          src="/images/Ellipse.svg"
          alt="Gradient ellipse overlay"
          fill
          className="ellipse-overlay object-cover"
          priority
        />
      <section className="space-y-4 pb-20">
        <WelcomeCard
          displayName={displayName}
          username={context?.user?.username}
          addressLabel={addressLabel}
          isVerified={isVerified}
          onConnect={isMiniApp ? handleSignIn : undefined}
          onConnectX={handleConnectX}
          onDisconnectX={handleDisconnectX}
          xConnection={xConnection ?? undefined}
          isLoading={isAuthenticating}
          showQuickAuth={isMiniApp}
        />
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
        <BalanceCard
          balance="15,750 $GM"
          change="+13.45%"
          onBuy={() => openUrl("https://docs.base.org")}
          onSell={() => openUrl("https://docs.base.org")}
          onSwap={() => openUrl("https://docs.base.org")}
          onMore={() => openUrl("https://docs.base.org")}
        />
        <TokenizationCard
          percentage={73.2}
          gmOnX="2.1M"
          gmOnFarcaster="956K"
          historical={[45, 62, 55, 68, 57, 66]}
        />
        <StreakCard
          dayProgress={[100, 120, 125, 180, 0, 0, 0]}
          currentStreak={30}
          difficultyLabel="Intermediate"
        />
        <DifficultyCard mintingDifficulty={5327} />
      </section>
    </div>
  );
}

