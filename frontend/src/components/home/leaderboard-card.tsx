"use client";

import Image from "next/image";

interface LeaderboardEntry {
  rank: number;
  name: string;
  amount: string;
}

interface LeaderboardCardProps {
  entries: LeaderboardEntry[];
  userEntry?: {
    rank: number;
    name: string;
    amount: string;
  };
  onViewFull: () => void;
}

export function LeaderboardCard({
  entries,
  userEntry,
  onViewFull,
}: LeaderboardCardProps) {
  return (
    <div className="mx-4 mb-4 rounded-2xl bg-white p-5 shadow-sm">
      <div className="flex items-center gap-2 mb-4">
        <h2 className="text-xl font-bold text-black">🏆 Leaderboard</h2>
      </div>
      <div className="space-y-2 mb-4">
        {entries.map((entry) => {
          const getBackgroundColor = () => {
            if (entry.rank === 1) {
              return "#E8EE58";
            } else if (entry.rank === 2 || entry.rank === 3) {
              return "#E8EE5866";
            }
            return "#FFFFFF";
          };

          return (
            <div
              key={entry.rank}
              className="flex items-center justify-between rounded-full px-4 py-2"
              style={{ backgroundColor: getBackgroundColor() }}
            >
              <div className="flex items-center gap-3">
                <span className="text-sm font-semibold text-black">
                  {entry.rank}
                </span>
                <span className="text-sm font-medium text-black">
                  {entry.name}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className="text-sm font-semibold text-black"
                  style={{ fontFamily: "var(--font-anton), sans-serif" }}
                >
                  {entry.amount}
                </span>
                <Image
                  src="/images/coinFace.svg"
                  alt="GM Coin"
                  width={20}
                  height={20}
                />
              </div>
            </div>
          );
        })}
        {userEntry && (
          <div
            className="flex items-center justify-between rounded-full px-4 py-2"
            style={{ backgroundColor: "#E5E5E5" }}
          >
            <div className="flex items-center gap-3">
              <span className="text-sm font-semibold text-gray-600">
                {userEntry.rank}
              </span>
              <span className="text-sm font-medium text-gray-700">
                {userEntry.name} (You)
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span
                className="text-sm font-semibold text-gray-700"
                style={{ fontFamily: "var(--font-anton), sans-serif" }}
              >
                {userEntry.amount}
              </span>
              <Image
                src="/images/coinFace.svg"
                alt="GM Coin"
                width={20}
                height={20}
              />
            </div>
          </div>
        )}
      </div>
      <button
        onClick={onViewFull}
        className="text-sm text-gray-600 hover:text-black transition flex items-center gap-1"
      >
        See full leaderboard
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
  );
}
