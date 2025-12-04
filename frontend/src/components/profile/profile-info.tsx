"use client";

import Image from "next/image";

interface ProfileInfoProps {
  username: string;
  gmId: string;
}

export function ProfileInfo({ username, gmId }: ProfileInfoProps) {
  return (
    <div className="flex flex-col items-center px-4 mb-6">
      <div className="mb-4">
        <Image
          src="/images/mascot2.svg"
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

