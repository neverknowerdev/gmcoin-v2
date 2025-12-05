"use client";

import Image from "next/image";
import type { XProfile } from "@/types/social";

interface AccountConnectionsProps {
  xConnection: XProfile | null;
  isFarcasterConnected: boolean;
  onConnectX: () => void;
  onConnectFarcaster: () => void;
}

export function AccountConnections({
  xConnection,
  isFarcasterConnected,
  onConnectX,
  onConnectFarcaster,
}: AccountConnectionsProps) {
  return (
    <div className="mx-4 mb-4 space-y-3">
      {/* X Connection Card */}
      <div className="flex items-center gap-4 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-white border border-gray-200">
          <Image
            src="/images/xIcon.svg"
            alt="X icon"
            width={24}
            height={24}
            className="brightness-0"
          />
        </div>
        <div className="flex-1">
          <h3 className="text-base font-semibold text-black">Connect X</h3>
          <p className="text-xs text-gray-500">Link your X account</p>
        </div>
        {xConnection ? (
          <div className="flex-shrink-0 rounded-full bg-[#84D65B] px-4 py-2">
            <span className="text-sm font-medium text-black">✓ Connected</span>
          </div>
        ) : (
          <button
            onClick={onConnectX}
            className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full border-2 border-gray-300 bg-white transition hover:bg-gray-50"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 20 20"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M10 4V16M4 10H16"
                stroke="black"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </button>
        )}
      </div>

      {/* Farcaster Connection Card */}
      <div className="flex items-center gap-4 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-white border border-gray-200">
          <Image
            src="/images/farcasterIcon.svg"
            alt="Farcaster icon"
            width={24}
            height={24}
            className="brightness-0"
          />
        </div>
        <div className="flex-1">
          <h3 className="text-base font-semibold text-black">Connect Forecaster</h3>
          <p className="text-xs text-gray-500">Link your Forecaster account</p>
        </div>
        {isFarcasterConnected ? (
          <div className="flex-shrink-0 rounded-full bg-[#84D65B] px-4 py-2">
            <span className="text-sm font-medium text-black">✓ Connected</span>
          </div>
        ) : (
          <button
            onClick={onConnectFarcaster}
            className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full border-2 border-gray-300 bg-white transition hover:bg-gray-50"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 20 20"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M10 4V16M4 10H16"
                stroke="black"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}

