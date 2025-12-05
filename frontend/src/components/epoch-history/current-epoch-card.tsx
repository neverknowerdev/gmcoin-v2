"use client";

import Image from "next/image";
import { Info } from "lucide-react";

interface CurrentEpochCardProps {
  epochNumber: number;
  currentDay: number;
  totalDays: number;
  mintingDifficulty: string;
  onHowItWorks?: () => void;
}

export function CurrentEpochCard({
  epochNumber,
  currentDay,
  totalDays,
  mintingDifficulty,
  onHowItWorks,
}: CurrentEpochCardProps) {
  return (
    <div className="mx-4 mb-4 rounded-2xl bg-[#E8EE58] p-5 shadow-sm relative z-10">
      <h2
        className="text-2xl font-bold text-black mb-2"
        style={{ fontFamily: "var(--font-anton), sans-serif" }}
      >
        CURRENT EPOCH {epochNumber}
      </h2>
      <p className="text-sm text-black mb-3">Day {currentDay} of {totalDays}</p>
      
      <button
        onClick={onHowItWorks}
        className="flex items-center gap-1 rounded-full bg-white px-3 py-1.5 text-xs font-medium text-black hover:bg-gray-100 transition mb-4"
      >
        <Info className="h-3 w-3" />
        How it works?
      </button>

      <div className="rounded-xl bg-white p-4 shadow-sm flex flex-col items-center">
        <p className="text-xs text-gray-600 mb-1">Minting Difficulty:</p>
        <div className="flex items-baseline gap-2 mb-1">
          <p
            className="text-3xl font-bold text-black"
            style={{ fontFamily: "var(--font-anton), sans-serif" }}
          >
            {mintingDifficulty}
          </p>
          <Image
            src="/images/coinFace.svg"
            alt="GM Coin"
            width={28}
            height={28}
          />
        </div>
        <span className="text-xs text-gray-600">per post/like</span>
      </div>
    </div>
  );
}

