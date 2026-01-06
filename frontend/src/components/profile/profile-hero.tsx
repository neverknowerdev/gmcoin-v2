"use client";

import Image from "next/image";
import { Edit3, Bell } from "lucide-react";

type ProfileHeroProps = {
  displayName: string;
  username?: string;
  address: string;
  avatarUrl: string;
  onConnectX?: () => void;
  onConnectFarcaster?: () => void;
};

export function ProfileHero({
  displayName,
  username,
  address,
  avatarUrl,
  onConnectX,
  onConnectFarcaster,
}: ProfileHeroProps) {
  return (
    <div className="text-white flex flex-col items-center">
      <div className="relative mx-auto flex w-max flex-col items-center">
        <Image
          src={avatarUrl}
          alt="Profile avatar"
          width={120}
          height={120}
          className="rounded-full border-4 border-white/40 shadow-xl"
        />
        <button className="absolute bottom-2 right-2 rounded-full bg-white/80 p-2 text-slate-900 shadow">
          <Edit3 className="h-4 w-4" />
        </button>
        <button className="absolute -top-2 -right-30 rounded-full p-2 text-black">
          <Bell className="h-6 w-6" />
        </button>
      </div>
      <div className="mt-4 text-center">
        <p className="text-xl font-semibold">{displayName}</p>
        <p className="text-sm text-white/80">@{username ?? "friend"}</p>
        <p className="text-xs text-white/60">{address}</p>
      </div>
      <div className="mt-2 flex items-center gap-2 text-xs font-semibold text-slate-900">
        <button
          onClick={onConnectX}
          className="glass flex items-center justify-center gap-2 rounded-full border border-white/60 bg-white/15 px-3 py-2 text-xs shadow-inner transition hover:bg-white/25"
        >
          Connect
          <Image src="/images/xIcon.svg" alt="X icon" width={16} height={16} />
        </button>
        <button
          onClick={onConnectFarcaster}
          className="glass flex items-center justify-center gap-2 rounded-full border border-emerald-200 bg-emerald-100/80 px-3 py-2 text-xs shadow-inner transition hover:bg-emerald-100"
        >
          Connect
          <Image
            src="/images/farcasterIcon.svg"
            alt="Farcaster icon"
            width={16}
            height={16}
          />
        </button>
      </div>
    </div>
  );
}
