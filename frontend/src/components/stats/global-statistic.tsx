"use client";

import Image from "next/image";

interface GlobalStatisticProps {
  totalTokenized: string;
  totalUsers: string;
  usersToday: string;
}

export function GlobalStatistic({
  totalTokenized,
  totalUsers,
  usersToday,
}: GlobalStatisticProps) {
  return (
    <div className="mx-4 mb-4 rounded-2xl bg-white p-5 shadow-sm">
      <h2
        className="text-2xl font-bold text-black mb-4"
        style={{ fontFamily: "var(--font-anton), sans-serif" }}
      >
        Global Statistic
      </h2>

      {/* Total Tokenized GMs */}
      <div className="mb-6">
        <p className="text-sm text-gray-600 mb-2">Total tokenized GMs</p>
        <div className="flex justify-between items-center gap-2">
          <div className="flex items-center gap-2">
            <p
              className="text-6xl font-bold text-black"
              style={{ fontFamily: "var(--font-anton), sans-serif" }}
            >
              {totalTokenized}
            </p>
            <span className="text-lg text-gray-600" style={{ fontFamily: "var(--font-anton), sans-serif" }}>GM</span>
          </div>
          <Image
            src="/images/coinFace.svg"
            alt="GM Coin"
            width={80}
            height={80}
          />
        </div>
      </div>

      {/* Total Users */}
      <div>
        <p className="text-sm text-gray-600 mb-2">
          Total users{" "}
          <span className="text-green-600">({usersToday} users today)</span>
        </p>
        <div className="flex items-center gap-2">
          <p
            className="text-6xl font-bold text-black"
            style={{ fontFamily: "var(--font-anton), sans-serif" }}
          >
            {totalUsers}
          </p>
          <Image
            src="/images/bird2.svg"
            alt="Bird mascot"
            width={80}
            height={80}
          />
        </div>
      </div>
    </div>
  );
}
