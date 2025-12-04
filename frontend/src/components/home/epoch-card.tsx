"use client";

import Image from "next/image";

interface EpochCardProps {
  epochNumber: number;
  currentDay: number;
  totalDays: number;
  mintingDifficulty: string;
  onHowItWorks: () => void;
  onViewHistory: () => void;
}

export function EpochCard({
  epochNumber,
  currentDay,
  totalDays,
  mintingDifficulty,
  onHowItWorks,
  onViewHistory,
}: EpochCardProps) {
  return (
    <div
      className="mb-4 relative py-5"
      style={{
        marginLeft: "calc(-50vw + 50%)",
        marginRight: "calc(-50vw + 50%)",
        width: "100vw",
        maxWidth: "100vw",
      }}
    >
      {/* Background image covering full width of section - breaks out of all container constraints */}
      <div
        className="absolute inset-y-0 z-0"
        style={{
          left: 0,
          right: 0,
          width: "100%",
          backgroundImage: "url(/images/union.svg)",
          backgroundSize: "100% 100%",
          backgroundRepeat: "no-repeat",
          backgroundPosition: "center center",
        }}
      />

      {/* Mascot positioned at top right, outside the card */}
      <Image
        src="/images/mascot.svg"
        alt="Sun mascot"
        width={80}
        height={80}
        className="absolute -top-0 right-4 z-20"
      />

      <div className="m-8 rounded-2xl bg-white p-5 shadow-sm relative overflow-hidden z-10">
        <div className="mt-4 flex items-start justify-between">
          <div className="flex-1">
            <div className="mb-2">
              <h2
                className="text-2xl font-bold text-black"
                style={{ fontFamily: "var(--font-anton), sans-serif" }}
              >
                EPOCH {epochNumber}
              </h2>
            </div>
            <p className="text-sm text-gray-600 mb-2">
              Day {currentDay} of {totalDays}
            </p>
            <button
              onClick={onHowItWorks}
              className="flex items-center gap-1 rounded-full bg-[#E8EE58] px-2 py-1 text-xs font-medium text-black hover:bg-yellow-200 transition"
            >
              <svg
                width="12"
                height="12"
                viewBox="0 0 12 12"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <circle cx="6" cy="6" r="5" stroke="black" strokeWidth="1.5" />
                <path
                  d="M6 4V6M6 8H6.01"
                  stroke="black"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
              How it works?
            </button>

            <div className="flex flex-col items-center border-2 border-gray-400 rounded-xl p-3 my-2">
              <p className="text-sm text-gray-600 mb-1">Minting Difficulty:</p>
              <div className="flex items-baseline gap-2">
                <p className="text-4xl font-bold text-black" style={{ fontFamily: "var(--font-anton), sans-serif" }}>
                  {mintingDifficulty}
                </p>
                <Image
                  src="/images/coinFace.svg"
                  alt="GM Coin"
                  width={34}
                  height={34}
                />
              </div>
              <span className="text-sm text-gray-600">per post/like</span>
            </div>

            <p className="text-xs text-gray-500 mb-3">
              Next epoch may adjust the difficulty
            </p>

            <button
              onClick={onViewHistory}
              className="text-sm text-gray-600 hover:text-black transition flex items-center gap-1"
            >
              Epoch History
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M6 12L10 8L6 4"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
