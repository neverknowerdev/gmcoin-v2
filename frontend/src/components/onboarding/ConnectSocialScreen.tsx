"use client";

import Image from "next/image";

interface ConnectSocialScreenProps {
  title: string;
  description: string;
  onConnectX: () => void;
  onConnectFarcaster: () => void;
}

export function ConnectSocialScreen({
  title,
  description,
  onConnectX,
  onConnectFarcaster,
}: ConnectSocialScreenProps) {
  return (
    <>
      <div className="flex h-full w-full flex-col items-center justify-between px-6 py-8">
        {/* Coin image at top */}
        <div className="mt-8 flex justify-center">
          <Image
            src="/images/coinFace.svg"
            alt="GM Coin"
            width={200}
            height={200}
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
            <p className="mb-8 max-w-xs text-center text-base leading-relaxed text-gray-600">
              {description}
            </p>
          )}

          {/* Connect buttons */}
          <div className="mb-6 flex w-full max-w-xs flex-col gap-4">
            {/* Connect X button */}
            <button
              onClick={onConnectX}
              className="flex w-full items-center justify-center gap-3 rounded-full bg-black px-6 py-3 text-base font-normal text-white transition hover:bg-black/90"
            >
              <Image
                src="/images/xIcon.svg"
                alt="X icon"
                width={20}
                height={20}
                className="brightness-0 invert"
              />
              <span style={{ fontFamily: "var(--font-anton), sans-serif" }}>
                Connect X
              </span>
            </button>

            {/* Connect Farcaster button */}
            <button
              onClick={onConnectFarcaster}
              className="flex w-full items-center justify-center gap-3 rounded-full border-2 border-black bg-white px-6 py-3 text-base font-normal text-black transition hover:bg-gray-50"
            >
              <Image
                src="/images/farcasterIcon.svg"
                alt="Farcaster icon"
                width={20}
                height={20}
                className="brightness-0"
              />
              <span style={{ fontFamily: "var(--font-anton), sans-serif" }}>
                Connect Farcaster
              </span>
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

