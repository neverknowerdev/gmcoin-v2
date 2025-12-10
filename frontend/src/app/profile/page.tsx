"use client";

import { ShieldCheck, Bell, LogOut, FileText } from "lucide-react";
import { useMiniKit, useOpenUrl } from "@coinbase/onchainkit/minikit";
import { useMemo, useState, useCallback } from "react";
import { ProfileHero } from "@/components/profile/profile-hero";
import { getFarcasterProfileUrl, getXProfileUrl } from "@/lib/social-links";

const SETTINGS = [
  { id: "terms", label: "Terms of use", icon: FileText },
  { id: "privacy", label: "Privacy policy", icon: ShieldCheck },
];

export default function ProfilePage() {
  const { context } = useMiniKit();
  const openUrl = useOpenUrl();
  const [notifications, setNotifications] = useState(true);

  const displayName = useMemo(
    () => context?.user?.displayName ?? context?.user?.username ?? "Friend",
    [context?.user?.displayName, context?.user?.username]
  );

  const farcasterProfileUrl = useMemo(
    () =>
      getFarcasterProfileUrl({
        username: context?.user?.username,
        fid: context?.user?.fid,
      }),
    [context?.user?.fid, context?.user?.username]
  );

  const xProfileUrl = useMemo(
    () => getXProfileUrl(context?.user?.username),
    [context?.user?.username]
  );

  const handleSocialLink = useCallback(
    (target: string) => {
      if (!target) return;
      if (context) {
        void openUrl(target);
      } else if (typeof window !== "undefined") {
        window.open(target, "_blank", "noopener,noreferrer");
      }
    },
    [context, openUrl]
  );

  return (
    <div className="relative flex min-h-screen flex-col px-4 pb-28 pt-10 text-white">
      <ProfileHero
        displayName={displayName}
        username={context?.user?.username}
        address={
          context?.user?.fid ? `fid:${context.user.fid}` : "0x...dA628d"
        }
        avatarUrl="/images/gmCup2.svg"
        onConnectX={() => handleSocialLink(xProfileUrl)}
        onConnectFarcaster={() => handleSocialLink(farcasterProfileUrl)}
      />

      <div className="mt-8 space-y-3">
        {SETTINGS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            className="glass flex w-full items-center justify-between rounded-[26px] border border-white/30 bg-white/12 px-4 py-3 text-white shadow-[0_20px_50px_rgba(3,7,18,0.35)] backdrop-blur-2xl"
          >
            <div className="flex items-center gap-3 text-sm font-semibold">
              <Icon className="h-4 w-4" />
              {label}
            </div>
            <span>➜</span>
          </button>
        ))}

        <div className="glass flex items-center justify-between rounded-[26px] border border-white/30 bg-white/12 px-4 py-3 text-white shadow-[0_20px_50px_rgba(3,7,18,0.35)] backdrop-blur-2xl">
          <div className="flex items-center gap-3 text-sm font-semibold">
            <Bell className="h-4 w-4" />
            Notifications
          </div>
          <button
            onClick={() => setNotifications((prev) => !prev)}
            className={`h-6 w-12 rounded-full border border-white/40 bg-white/10 p-0.5 transition ${
              notifications ? "bg-emerald-400/50" : "bg-white/10"
            }`}
          >
            <span
              className={`block h-full w-5 rounded-full bg-white shadow transition ${
                notifications ? "translate-x-6" : ""
              }`}
            />
          </button>
        </div>
      </div>

      <button className="mt-26 glass flex items-center justify-between rounded-[26px] border border-white/40 bg-white/15 px-5 py-3 text-white shadow-[0_20px_60px_rgba(3,7,18,0.35)] backdrop-blur-2xl">
        <span className="flex items-center gap-3 font-semibold">
          <LogOut className="h-4 w-4" />
          Sign out
        </span>
        <span>↽</span>
      </button>
    </div>
  );
}

