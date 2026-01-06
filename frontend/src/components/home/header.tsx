"use client";

import Image from "next/image";
import { Bell } from "lucide-react";
import { useEffect, useState } from "react";
import type { XProfile } from "@/types/social";

export function Header() {
  const [xConnection, setXConnection] = useState<XProfile | null>(null);

  useEffect(() => {
    const refreshXConnection = async () => {
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

    void refreshXConnection();
  }, []);
  return (
    <div className="flex items-center justify-between px-4 py-3">
      <h1 className="text-3xl font-bold text-black" style={{ fontFamily: "var(--font-anton), sans-serif" }}>GM</h1>
      <div className="flex items-center gap-2">
        {xConnection && (
          <div className="flex items-center gap-2 rounded-full bg-black px-3 py-1.5">
            <Image
              src="/images/xIcon.svg"
              alt="X icon"
              width={16}
              height={16}
              className="brightness-0 invert"
            />
            <span className="text-sm font-medium text-white">Connected</span>
          </div>
        )}
        <div className="relative">
          <button className="flex items-center justify-center rounded-full border border-gray-200 bg-white p-2">
            <svg
              width="20"
              height="20"
              viewBox="0 0 20 20"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M10 10C11.3807 10 12.5 8.88071 12.5 7.5C12.5 6.11929 11.3807 5 10 5C8.61929 5 7.5 6.11929 7.5 7.5C7.5 8.88071 8.61929 10 10 10Z"
                fill="black"
              />
              <path
                d="M10 11.25C7.92893 11.25 6.25 12.9289 6.25 15V16.25H13.75V15C13.75 12.9289 12.0711 11.25 10 11.25Z"
                fill="black"
              />
            </svg>
          </button>
          <div className="absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full bg-red-500 border-2 border-white" />
        </div>
        <button className="flex items-center justify-center">
          <svg
            width="20"
            height="20"
            viewBox="0 0 20 20"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M5 7.5L10 12.5L15 7.5"
              stroke="black"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>
    </div>
  );
}

