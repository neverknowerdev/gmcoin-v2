"use client";

import Image from "next/image";

interface Source {
  platform: "x" | "farcaster";
  percentage: number;
}

interface GMSourcesProps {
  sources: Source[];
}

export function GMSources({ sources }: GMSourcesProps) {
  return (
    <div className="mx-4 mb-4 rounded-2xl bg-white p-5 shadow-sm">
      <h2
        className="text-2xl font-bold text-black mb-4"
        style={{ fontFamily: "var(--font-anton), sans-serif" }}
      >
        Where GMs come from
      </h2>
      
      <div className="space-y-4">
        {sources.map((source) => (
          <div key={source.platform}>
            <div className="flex items-center gap-3 mb-2">
              <Image
                src={source.platform === "x" ? "/images/xIcon.svg" : "/images/farcasterIcon.svg"}
                alt={source.platform === "x" ? "X" : "Farcaster"}
                width={24}
                height={24}
              />
              <span className="font-semibold text-black capitalize">
                {source.platform === "x" ? "X" : "Farcaster"}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex-1 h-3 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#E8EE58] rounded-full transition-all"
                  style={{ width: `${source.percentage}%` }}
                />
              </div>
              <span className="text-sm font-bold text-black" style={{ fontFamily: "var(--font-anton), sans-serif" }}>
                {source.percentage}%
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

