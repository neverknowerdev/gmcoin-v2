"use client";

import Image from "next/image";

interface TokenizationCardNewProps {
  percentage: number;
  growthToday: number;
  historical: number[];
  onViewStats: () => void;
}

export function TokenizationCardNew({
  percentage,
  growthToday,
  historical,
  onViewStats,
}: TokenizationCardNewProps) {
  // Create a simple line graph
  const maxValue = Math.max(...historical, 100);
  const points = historical.map((value, index) => {
    const x = (index / (historical.length - 1)) * 100;
    const y = 100 - (value / maxValue) * 100;
    return `${index === 0 ? "M" : "L"} ${x},${y}`;
  }).join(" ");

  return (
    <div className="mx-4 mb-4 rounded-2xl bg-white p-5 shadow-sm relative overflow-hidden">
      
      <div className="mt-4">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold text-black mb-1" style={{ fontFamily: "var(--font-anton), sans-serif" }}>Tokenization Progress</h2>
            <p className="text-[11px] text-gray-600">Tokenize every GM on X and Farcaster</p>
          </div>
          <div className="flex items-center gap-1 rounded-full bg-[#65CC32]  px-3 py-1.5 absolute right-0 top-0">
            <span className="text-xs font-semibold text-black">🔥 {growthToday}% growth today</span>
          </div>
        </div>
        
        <div className="flex items-baseline justify-between gap-2 mb-3">
          <p className="text-3xl font-bold text-black" style={{ fontFamily: "var(--font-anton), sans-serif" }}>{percentage}%</p>
          <Image
            src="/images/coinFace.svg"
            alt="GM Coin"
            width={34}
            height={34}
          />
        </div>
        
        {/* Progress bar */}
        <div className="h-3 bg-gray-200 rounded-full mb-4 overflow-hidden">
          <div
            className="h-full bg-yellow-400 rounded-full transition-all"
            style={{ width: `${percentage}%` }}
          />
        </div>
        
        <p className="text-xs text-gray-500 mb-4">
          We&apos;re turning every GM into on-chain GM Coin. Track how the mission progresses.
        </p>
        
        {/* Graph */}
        <div className="h-20 mb-4 bg-gray-50 rounded-lg p-2">
          <svg viewBox="0 0 100 100" className="w-full h-full" preserveAspectRatio="none">
            <path
              d={points}
              stroke="#10B981"
              strokeWidth="2"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d={`${points} L 100,100 L 0,100 Z`}
              fill="url(#gradient)"
              opacity="0.2"
            />
            <defs>
              <linearGradient id="gradient" x1="0" y1="0" x2="0" y2="100">
                <stop offset="0%" stopColor="#10B981" stopOpacity="0.3" />
                <stop offset="100%" stopColor="#10B981" stopOpacity="0" />
              </linearGradient>
            </defs>
          </svg>
        </div>
        
        <button
          onClick={onViewStats}
          className="text-sm font-semibold text-gray-600 hover:text-black transition flex items-center gap-1"
        >
          View detailed statistics
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
  );
}

