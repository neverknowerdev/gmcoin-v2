"use client";

interface ProfileStatsProps {
  balance: string;
  streak: string;
  rank: string;
}

export function ProfileStats({ balance, streak, rank }: ProfileStatsProps) {
  return (
    <div className="px-4 mb-6 flex gap-3">
      {/* Balance Card */}
      <div className="flex-1 rounded-2xl bg-white p-4 shadow-sm border border-gray-100">
        <p className="text-xs text-gray-600 mb-1">Balance</p>
        <p
          className="text-2xl font-bold text-black"
          style={{ fontFamily: "var(--font-anton), sans-serif" }}
        >
          {balance}
        </p>
      </div>
      
      {/* Streak Card */}
      <div className="flex-1 rounded-2xl bg-white p-4 shadow-sm border border-gray-100">
        <p className="text-xs text-gray-600 mb-1">Streak</p>
        <p
          className="text-2xl font-bold text-black"
          style={{ fontFamily: "var(--font-anton), sans-serif" }}
        >
          {streak}
        </p>
      </div>
      
      {/* Rank Card */}
      <div className="flex-1 rounded-2xl bg-white p-4 shadow-sm border border-gray-100">
        <p className="text-xs text-gray-600 mb-1">Rank</p>
        <p
          className="text-2xl font-bold text-black"
          style={{ fontFamily: "var(--font-anton), sans-serif" }}
        >
          {rank}
        </p>
      </div>
    </div>
  );
}

