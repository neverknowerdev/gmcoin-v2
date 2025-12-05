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
        <div className="">
          <h2
            className="text-2xl font-bold text-black"
            style={{ fontFamily: "var(--font-anton), sans-serif" }}
          >
            Engagement Impact
          </h2>
          <div className="flex items-center gap-4">
            {/* Like received */}
            <div className="">
              <p className="text-lg text-gray-600 mb-2">Like received</p>
              <p
                className="text-3xl font-bold text-black"
                style={{ fontFamily: "var(--font-anton), sans-serif" }}
              >
                {likesReceived}
              </p>
            </div>

            {/* Reports */}
            <div className="">
              <p className="text-lg text-gray-600 mb-2">Reports</p>
              <p
                className="text-3xl font-bold text-black"
                style={{ fontFamily: "var(--font-anton), sans-serif" }}
              >
                {reports}
              </p>
            </div>
          </div>
        </div>
        <Image
          src="/images/mascot.svg"
          alt="Sun mascot"
          width={80}
          height={80}
          className="flex-shrink-0"
        />
      </div>

      {/* Higher engagement badge */}
      <div className="rounded-full bg-[#84D65B] px-4 py-2 inline-block mt-2">
        <span className="text-sm font-medium text-black">
          Higher engagement = more GM
        </span>
      </div>
    </div>
  );
}
