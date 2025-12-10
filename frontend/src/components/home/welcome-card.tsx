import Image from "next/image";
import { ArrowRight, Bell, ShieldCheck } from "lucide-react";
import { useProfile, useSignIn } from "@farcaster/auth-kit";
import { useState, useRef, useEffect } from "react";
import { useFarcasterSIWE } from "@/hooks/useFarcasterSIWE";

type WelcomeCardProps = {
  displayName: string;
  username?: string;
  addressLabel: string;
  isVerified: boolean;
  isLoading: boolean;
  onConnect?: () => void;
  onConnectX?: () => void;
  onDisconnectX?: () => void;
  showQuickAuth?: boolean;
  xConnection?: {
    name: string;
    username: string;
    profileImageUrl?: string | null;
  };
};

const truncateUsername = (username: string, maxLength: number = 5) => {
  if (username.length <= maxLength) return username;
  return `${username.slice(0, maxLength)}…`;
};

export function WelcomeCard({
  displayName,
  username,
  addressLabel,
  isVerified,
  isLoading,
  onConnect,
  onConnectX,
  onDisconnectX,
  showQuickAuth = true,
  xConnection,
}: WelcomeCardProps) {
  const [showXDropdown, setShowXDropdown] = useState(false);
  const [showFarcasterDropdown, setShowFarcasterDropdown] = useState(false);
  const xDropdownRef = useRef<HTMLDivElement>(null);
  const farcasterDropdownRef = useRef<HTMLDivElement>(null);

  const isXConnected = Boolean(xConnection);
  const avatarSrc = xConnection?.profileImageUrl ?? "/images/gmCoin.svg";
  const isExternalAvatar = Boolean(xConnection?.profileImageUrl);

  const {
    connect: connectFarcaster,
    signIn: signInFarcaster,
    signOut: signOutFarcaster,
    isConnected: isFarcasterConnected,
    isPolling: isFarcasterPolling,
    url: farcasterUrl,
  } = useSignIn({});

  const { profile: farcasterProfile } = useProfile();
  const { isVerifying: isFarcasterVerifying } = useFarcasterSIWE();

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        xDropdownRef.current &&
        !xDropdownRef.current.contains(event.target as Node)
      ) {
        setShowXDropdown(false);
      }
      if (
        farcasterDropdownRef.current &&
        !farcasterDropdownRef.current.contains(event.target as Node)
      ) {
        setShowFarcasterDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleXClick = () => {
    if (isXConnected) {
      setShowXDropdown(!showXDropdown);
    } else {
      onConnectX?.();
    }
  };

  const handleFarcasterClick = async () => {
    if (isFarcasterConnected) {
      setShowFarcasterDropdown(!showFarcasterDropdown);
    } else {
      try {
        await connectFarcaster();
        if (farcasterUrl && typeof window !== "undefined") {
          window.open(farcasterUrl, "_blank", "noopener,noreferrer");
        }
        await signInFarcaster();
      } catch (error) {
        console.error("Farcaster sign-in failed", error);
      }
    }
  };

  const handleDisconnectX = () => {
    onDisconnectX?.();
    setShowXDropdown(false);
  };

  const handleDisconnectFarcaster = () => {
    signOutFarcaster();
    setShowFarcasterDropdown(false);
  };

  const xUsername = isXConnected
    ? truncateUsername(xConnection?.username ?? "")
    : "";
  const farcasterUsername = isFarcasterConnected
    ? truncateUsername(farcasterProfile?.username ?? "")
    : "";

  return (
    <div className="glass rounded-[28px] border-white/30 bg-white/10 p-5 text-sm text-slate-900 shadow-[0_25px_70px_rgba(6,17,38,0.45)] backdrop-blur-2xl">
      <div className="flex items-center gap-2">
        <div className="relative">
          {isExternalAvatar ? (
            // Use a regular img tag for external X avatars to avoid Next image domain config.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={avatarSrc}
              alt={xConnection?.name ?? "X profile"}
              width={60}
              height={60}
              className="rounded-full border border-white/50 object-cover"
            />
          ) : (
            <Image
              src={avatarSrc}
              alt="GM Coin"
              width={60}
              height={60}
              className="rounded-full border border-white/50"
            />
          )}
          {isVerified && (
            <span className="absolute -bottom-1 -right-1 rounded-full bg-emerald-400 p-1 text-white">
              <ShieldCheck className="h-3 w-3" />
            </span>
          )}
        </div>
        <div className="flex-1">
          <div className="flex flex-col">
            <p className="text-2xl font-bold">Welcome</p>
            <p className="text-lg font-semibold">{displayName}!</p>
          </div>
          <p className="text-xs text-white/70">
            {addressLabel}
          </p>
          <div className="mt-2 flex items-center gap-1.5 text-[11px] font-semibold text-slate-900">
            <div className="relative" ref={xDropdownRef}>
              <button
                type="button"
                onClick={handleXClick}
                className="glass flex items-center justify-center gap-1.5 rounded-full border border-white/60 bg-white/15 px-2.5 py-1.5 text-[11px] shadow-inner transition hover:bg-white/25 disabled:opacity-60"
                disabled={!onConnectX && !isXConnected}
              >
                {isXConnected ? (
                  <>
                    <ShieldCheck className="h-3 w-3 text-emerald-400" />
                    @{xUsername}
                    <Image
                      src="/images/xIcon.svg"
                      alt="X icon"
                      width={16}
                      height={16}
                    />
                  </>
                ) : (
                  <>
                    Connect
                    <Image
                      src="/images/xIcon.svg"
                      alt="X icon"
                      width={16}
                      height={16}
                    />
                  </>
                )}
              </button>
              {showXDropdown && isXConnected && (
                <div className="absolute left-0 top-full z-50 mt-1 rounded-lg border border-white/30 bg-white/10 backdrop-blur-md shadow-lg">
                  <button
                    type="button"
                    onClick={handleDisconnectX}
                    className="w-full rounded-lg px-3 py-2 text-left text-[11px] text-white/90 transition hover:bg-white/20"
                  >
                    Disconnect
                  </button>
                </div>
              )}
            </div>
            <div className="relative" ref={farcasterDropdownRef}>
              <button
                type="button"
                onClick={handleFarcasterClick}
                disabled={isFarcasterPolling || isFarcasterVerifying}
                className="glass flex items-center justify-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-100/80 px-2.5 py-1.5 text-[11px] shadow-inner text-black transition hover:bg-emerald-100 disabled:opacity-60"
              >
                {isFarcasterConnected && (
                  <ShieldCheck className="h-3 w-3 text-emerald-500" />
                )}
                {isFarcasterPolling
                  ? "Waiting…"
                  : isFarcasterVerifying
                    ? "Verifying…"
                    : isFarcasterConnected
                      ? `@${farcasterUsername}`
                      : "Connect"}
                <Image
                  src="/images/farcasterIcon.svg"
                  alt="Farcaster icon"
                  width={16}
                  height={16}
                />
              </button>
              {showFarcasterDropdown && isFarcasterConnected && (
                <div className="absolute left-0 top-full z-50 mt-1 rounded-lg border border-emerald-200/30 bg-emerald-100/10 backdrop-blur-md shadow-lg">
                  <button
                    type="button"
                    onClick={handleDisconnectFarcaster}
                    className="w-full rounded-lg px-3 py-2 text-left text-[11px] text-emerald-900 transition hover:bg-emerald-100/30"
                  >
                    Disconnect
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
        <button className="rounded-full absolute right-5 top-5 border border-white/30 p-2 text-white/80">
          <Bell className="h-4 w-4" />
        </button>
      </div>
      {showQuickAuth && onConnect && (
        <button
          type="button"
          onClick={onConnect}
          disabled={isLoading}
          className="mt-4 flex w-full items-center justify-between rounded-2xl border border-white/40 bg-white/20 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/30 disabled:opacity-60"
        >
          <span>
            {isLoading ? "Requesting signature..." : "Enable quick auth"}
          </span>
          <ArrowRight className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
