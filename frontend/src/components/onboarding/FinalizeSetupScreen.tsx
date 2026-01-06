"use client";

import Image from "next/image";
import type { XProfile } from "@/types/social";

interface FinalizeSetupScreenProps {
  title: string;
  description: string;
  xConnection: XProfile | null;
  isFarcasterConnected: boolean;
  farcasterProfile: { username?: string } | null;
  onConnectX: () => void;
  onConnectFarcaster: () => void;
  onSignUp: () => void;
}

export function FinalizeSetupScreen({
  title,
  description,
  xConnection,
  isFarcasterConnected,
  farcasterProfile,
  onConnectX,
  onConnectFarcaster,
  onSignUp,
}: FinalizeSetupScreenProps) {
  return (
    <>
      <div className="flex h-full w-full flex-col items-center justify-between px-6 py-8">
        {/* Coin image at top */}
        <div className="mt-4 flex justify-center">
          <Image
            src="/images/coinFace.svg"
            alt="GM Coin"
            width={180}
            height={180}
            priority
            className="drop-shadow-xl"
          />
        </div>

        {/* Content section */}
        <div className="flex w-full flex-1 flex-col items-center justify-center">
          {/* Heading */}
          <h1
            className="mb-3 text-3xl font-normal text-black sm:text-4xl"
            style={{ fontFamily: "var(--font-anton), sans-serif" }}
          >
            {title}
          </h1>

          {/* Description */}
          {description && (
            <p className="mb-8 max-w-xs text-center text-sm leading-relaxed text-gray-600">
              {description}
            </p>
          )}

          {/* Connection Cards */}
          <div className="mb-8 flex w-full max-w-sm flex-col gap-4">
            {/* Connect X Card */}
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
                <p className="text-xs text-gray-500">Link your X account.</p>
              </div>
              {xConnection ? (
                <div className="flex-shrink-0 rounded-full bg-green-500 px-4 py-2">
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

            {/* Connect Farcaster Card */}
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
                <h3 className="text-base font-semibold text-black">Connect Farcaster</h3>
                <p className="text-xs text-gray-500">Link your Farcaster account.</p>
              </div>
              {isFarcasterConnected && farcasterProfile ? (
                <div className="flex-shrink-0 rounded-full bg-green-500 px-4 py-2">
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
        </div>

        {/* Sign Up button at bottom */}
        <div className="w-full pb-8">
          <div className="mx-auto w-full max-w-sm">
            <button
              onClick={onSignUp}
              disabled={!xConnection && !isFarcasterConnected}
              className="w-full cursor-pointer rounded-2xl bg-black px-6 py-4 text-base font-normal text-white transition hover:bg-black/90 disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-wide"
              style={{ fontFamily: "var(--font-anton), sans-serif" }}
            >
              Sign Up
            </button>
            <p className="mt-2 text-center text-xs text-gray-500">
              This transaction cost a small gas fee
            </p>
          </div>
        </div>
      </div>
    </>
  );
}

