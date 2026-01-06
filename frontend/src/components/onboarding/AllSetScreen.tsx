"use client";

import Image from "next/image";

interface AllSetScreenProps {
  title: string;
  description: string;
  onGoToDashboard: () => void;
}

export function AllSetScreen({
  title,
  description,
  onGoToDashboard,
}: AllSetScreenProps) {
  return (
    <>
      <div className="flex h-full w-full flex-col items-center justify-center px-6 py-8">
        {/* Mascot image */}
        <div className="mb-8 flex justify-center">
          <Image
            src="/images/mascot2.svg"
            alt="GM Mascot"
            width={200}
            height={200}
            priority
            className="drop-shadow-xl"
          />
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

        {/* Go to Dashboard button */}
        <div className="w-full max-w-xs">
          <button
            onClick={onGoToDashboard}
            className="w-full cursor-pointer rounded-full bg-black px-6 py-4 text-base font-normal text-white transition hover:bg-black/90 uppercase tracking-wide"
            style={{ fontFamily: "var(--font-anton), sans-serif" }}
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    </>
  );
}

