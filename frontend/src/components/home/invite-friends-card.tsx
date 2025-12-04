"use client";

import Image from "next/image";
import { Link } from "lucide-react";

interface InviteFriendsCardProps {
  onInvite: () => void;
}

export function InviteFriendsCard({ onInvite }: InviteFriendsCardProps) {
  return (
    <div className="mx-4 mb-4 rounded-2xl bg-[#E8EE58] px-5 py-3 shadow-sm">
      <div className="flex items-center gap-4">
        <Image
          src="/images/bird2.svg"
          alt="Bird mascot"
          width={60}
          height={60}
          className="flex-shrink-0"
        />
        <div className="flex-1">
          <h3 className="text-xl font-bold text-black mb-1" style={{ fontFamily: "var(--font-anton), sans-serif" }}>Invite friends</h3>
          <p className="text-[11px] text-gray-700">
            Earn bonuses when your friend join GM Coin
          </p>
        </div>
        <button
          onClick={onInvite}
          className="flex items-center gap-2 rounded-full bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 transition flex-shrink-0"
        >
          <Link className="h-4 w-4" />
          Invite
        </button>
      </div>
    </div>
  );
}

