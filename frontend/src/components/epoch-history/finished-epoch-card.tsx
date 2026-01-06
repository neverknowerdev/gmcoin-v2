"use client";

import Image from "next/image";

interface FinishedEpochCardProps {
  epochNumber: number;
  startDate: string;
  endDate: string;
  mintingDifficulty: string;
}

export function FinishedEpochCard({
  epochNumber,
  startDate,
  endDate,
  mintingDifficulty,
}: FinishedEpochCardProps) {
  return (
    <div className="mx-4 mb-4 rounded-2xl bg-white p-5 shadow-sm border border-gray-100 relative z-10">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h2
            className="text-2xl font-bold text-black mb-1"
            style={{ fontFamily: "var(--font-anton), sans-serif" }}
          >
            EPOCH {epochNumber}
          </h2>
          <p className="text-xs text-gray-600">
            {startDate} - {endDate}
          </p>
        </div>
        <div className="rounded-full bg-red-500 px-5 py-1">
          <span className="text-xs font-medium text-white">Finished</span>
        </div>
      </div>

      <div className="mt-4 flex flex-col items-center border border-gray-200 rounded-xl p-4">
        <p className="text-xs text-gray-600 mb-1">Minting Difficulty:</p>
        <div className="flex items-baseline gap-2">
          <p
            className="text-2xl font-bold text-black"
            style={{ fontFamily: "var(--font-anton), sans-serif" }}
          >
            {mintingDifficulty}
          </p>
          <Image
            src="/images/coinFace.svg"
            alt="GM Coin"
            width={24}
            height={24}
          />
        </div>
        <span className="text-xs text-gray-600">per post/like</span>
      </div>
    </div>
  );
}

