"use client";

import Image from "next/image";

interface ProfileInfoProps {
  username: string;
  gmId: string;
  profileImageUrl?: string | null;
}

export function ProfileInfo({ username, gmId, profileImageUrl }: ProfileInfoProps) {
  // Use X profile picture if available, otherwise fallback to default mascot
  const avatarSrc = profileImageUrl || "/images/mascot2.svg";
  
  return (
    <div className="flex flex-col items-center px-4 mb-6">
      <div className="mb-4">
        <Image
          src={avatarSrc}
          alt="Profile avatar"
          width={100}
          height={100}
          className="rounded-full"
        />
      </div>
      <p
        className="text-2xl font-bold text-black mb-1"
        style={{ fontFamily: "var(--font-anton), sans-serif" }}
      >
        @{username}
      </p>
      <p className="text-sm text-gray-600">GM ID: {gmId}</p>
    </div>
  );
}

