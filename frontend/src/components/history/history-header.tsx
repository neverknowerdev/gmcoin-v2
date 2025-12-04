"use client";

import Link from "next/link";

type FilterType = "all" | "minting" | "transfers";

interface HistoryHeaderProps {
  filter: FilterType;
  onFilterChange: (filter: FilterType) => void;
}

export function HistoryHeader({ filter, onFilterChange }: HistoryHeaderProps) {
  return (
    <div className="relative z-10 w-full pt-4 pb-6 mt-20">
      <div className="px-4">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1
              className="text-3xl font-bold text-black mb-1"
              style={{ fontFamily: "var(--font-anton), sans-serif" }}
            >
              History
            </h1>
            <p className="text-sm text-gray-600">
              Your daily $GM earnings and transactions
            </p>
          </div>
          <Link href="/history" className="text-sm text-gray-600 hover:text-black transition">
            See all &gt;
          </Link>
        </div>

        {/* Filter buttons */}
        <div className="flex gap-2">
          <button
            onClick={() => onFilterChange("all")}
            className={`rounded-full px-4 py-2 text-sm font-medium transition ${
              filter === "all"
                ? "bg-[#E8EE58] text-black"
                : "bg-white text-gray-600"
            }`}
          >
            All
          </button>
          <button
            onClick={() => onFilterChange("minting")}
            className={`rounded-full px-4 py-2 text-sm font-medium transition ${
              filter === "minting"
                ? "bg-[#E8EE58] text-black"
                : "bg-white text-gray-600"
            }`}
          >
            Minting
          </button>
          <button
            onClick={() => onFilterChange("transfers")}
            className={`rounded-full px-4 py-2 text-sm font-medium transition ${
              filter === "transfers"
                ? "bg-[#E8EE58] text-black"
                : "bg-white text-gray-600"
            }`}
          >
            Transfers
          </button>
        </div>
      </div>
    </div>
  );
}

