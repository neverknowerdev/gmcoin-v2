"use client";

import Image from "next/image";

interface FarcasterConfirmationScreenProps {
  title: string;
  description: string;
  isFarcasterConnected: boolean;
  farcasterProfile: { username?: string } | null;
  onConfirm: () => void;
  onConnectFarcaster: () => void;
}

export function FarcasterConfirmationScreen({
  title,
  description,
  isFarcasterConnected,
  farcasterProfile,
  onConfirm,
  onConnectFarcaster,
}: FarcasterConfirmationScreenProps) {
  return (
    <>
      <div className="flex h-full w-full flex-col items-center justify-center px-6 py-8">
        {/* Farcaster Logo */}
        <div className="mb-8 flex justify-center">
          <div className="flex h-24 w-24 items-center justify-center rounded-2xl bg-white shadow-lg">
            <Image
              src="/images/farcasterIcon.svg"
              alt="Farcaster logo"
              width={60}
              height={60}
              className="brightness-0"
            />
          </div>
        </div>

        {/* Heading */}
        <h1
          className="mb-4 text-center text-3xl font-normal text-black sm:text-4xl"
          style={{ fontFamily: "var(--font-anton), sans-serif" }}
        >
          {title}
        </h1>

        {/* Description */}
        {description && (
          <p className="mb-12 max-w-xs text-center text-base leading-relaxed text-black">
            {description}
          </p>
        )}

        {/* Confirm button */}
        <div className="w-full max-w-xs">
          {isFarcasterConnected && farcasterProfile ? (
            <button
              onClick={onConfirm}
              className="w-full cursor-pointer rounded-2xl bg-black px-6 py-4 text-base font-normal text-white transition hover:bg-black/90 uppercase tracking-wide"
              style={{ fontFamily: "var(--font-anton), sans-serif" }}
            >
              Confirm
            </button>
          ) : (
            <div className="w-full rounded-lg bg-yellow-50 p-4 text-sm text-yellow-800">
              <p className="mb-2">Please connect your Farcaster account first.</p>
              <button
                onClick={onConnectFarcaster}
                className="w-full rounded-lg bg-black px-4 py-2 text-sm font-normal text-white"
                style={{ fontFamily: "var(--font-anton), sans-serif" }}
              >
                Connect Farcaster
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

