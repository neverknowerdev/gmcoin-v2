"use client";

import { Clock } from "lucide-react";

interface BalanceSectionProps {
  balance: string;
  onHistory: () => void;
  onHowToEarn: () => void;
}

export function BalanceSection({
  balance,
  onHistory,
  onHowToEarn,
}: BalanceSectionProps) {
  return (
    <div className="px-4 py-2">
      <p className="text-sm text-gray-600 mb-1">Your balance:</p>
      <p className="text-4xl font-bold text-black mb-2" style={{ fontFamily: "var(--font-anton), sans-serif" }}>{balance}</p>
      <div className="">
        <button
          onClick={onHowToEarn}
          className="text-sm text-gray-600 hover:text-black transition"
        >
          How to earn?
        </button>
        <button
          onClick={onHistory}
          className="flex items-center gap-2 rounded-full bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 transition"
        >
          <Clock className="h-4 w-4" />
          History
        </button>
      </div>
    </div>
  );
}

