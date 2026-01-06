"use client";

import Image from "next/image";

interface FarcasterSuccessScreenProps {
  title: string;
  description: string;
  onContinue: () => void;
}

export function FarcasterSuccessScreen({
  title,
  description,
  onContinue,
}: FarcasterSuccessScreenProps) {
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

        {/* Connected Status Indicator */}
        <div className="mb-6 flex items-center justify-center gap-2 rounded-full bg-green-500 px-6 py-2">
          <svg
            width="20"
            height="20"
            viewBox="0 0 20 20"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M16.6667 5L7.50004 14.1667L3.33337 10"
              stroke="white"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <span className="text-base font-medium text-white">Connected</span>
        </div>

        {/* Heading */}
        <h1
          className="mb-4 text-3xl font-normal text-black sm:text-4xl"
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

        {/* Continue button */}
        <div className="w-full max-w-xs">
          <button
            onClick={onContinue}
            className="w-full cursor-pointer rounded-full bg-black px-6 py-4 text-base font-normal text-white transition hover:bg-black/90 uppercase tracking-wide"
            style={{ fontFamily: "var(--font-anton), sans-serif" }}
          >
            Continue
          </button>
        </div>
      </div>
    </>
  );
}

