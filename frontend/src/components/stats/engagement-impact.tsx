"use client";

import Image from "next/image";

interface EngagementImpactProps {
  likesReceived: string;
  reports: string;
}

export function EngagementImpact({
  likesReceived,
  reports,
}: EngagementImpactProps) {
  return (
    <div className="mx-4 mb-4 rounded-2xl bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between mb-4">
        <h2
          className="text-2xl font-bold text-black"
          style={{ fontFamily: "var(--font-anton), sans-serif" }}
        >
          Engagement Impact
        </h2>
        <Image
          src="/images/mascot2.svg"
          alt="Sun mascot"
          width={80}
          height={80}
          className="flex-shrink-0"
        />
      </div>

      {/* Like received */}
      <div className="mb-6">
        <p className="text-sm text-gray-600 mb-2">Like received</p>
        <p
          className="text-6xl font-bold text-black"
          style={{ fontFamily: "var(--font-anton), sans-serif" }}
        >
          {likesReceived}
        </p>
      </div>

      {/* Reports */}
      <div className="mb-4">
        <p className="text-sm text-gray-600 mb-2">Reports</p>
        <p
          className="text-6xl font-bold text-black"
          style={{ fontFamily: "var(--font-anton), sans-serif" }}
        >
          {reports}
        </p>
      </div>

      {/* Higher engagement badge */}
      <div className="rounded-full bg-green-500 px-4 py-2 inline-block mt-2">
        <span className="text-sm font-medium text-black">
          Higher engagement = more GM
        </span>
      </div>
    </div>
  );
}

