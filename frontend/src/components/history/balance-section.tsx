"use client";

import Image from "next/image";

export function HistoryBalanceSection() {
  return (
    <div className="relative z-10 px-4 py-2 pt-4">
      <p className="text-sm text-gray-600 mb-1 mt-10">Your balance:</p>
      <div className="flex items-center gap-2 mb-2">
        <p className="text-6xl font-bold text-black" style={{ fontFamily: "var(--font-anton), sans-serif" }}>
          32,822
        </p>
        <p className="text-2xl font-bold text-black" style={{ fontFamily: "var(--font-anton), sans-serif" }}>
          GM
        </p>
        <Image
          src="/images/sun.svg"
          alt="Sun mascot"
          width={100}
          height={100}
          className="ml-auto"
        />
      </div>
      <div className="gap-4 mb-4">
        <button className="text-sm text-gray-600 hover:text-black transition">
          How to earn?
        </button>
        <button className="flex items-center gap-1 rounded-full bg-gray-100 px-3 py-1.5 text-xs text-gray-600">
          <svg
            width="12"
            height="12"
            viewBox="0 0 12 12"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <circle cx="6" cy="6" r="5" stroke="#6B7280" strokeWidth="1.5" />
            <path
              d="M6 4V6M6 8H6.01"
              stroke="#6B7280"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
          Minting happens daily at 2 AM
        </button>
      </div>
    </div>
  );
}

