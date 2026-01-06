"use client";

import Image from "next/image";

interface Epoch {
  epochNumber: number;
  isCurrent?: boolean;
  startDate?: string;
  endDate?: string;
  mintingDifficulty: string;
}

interface EpochTableProps {
  epochs: Epoch[];
}

export function EpochTable({ epochs }: EpochTableProps) {
  return (
    <div className="relative z-10 mx-4 mb-32">
      <div className="rounded-2xl bg-white shadow-sm border border-gray-100 overflow-hidden">
        {/* Table Header */}
        <div className="grid grid-cols-4 gap-4 px-4 py-3 bg-gray-50 border-b border-gray-200">
          <div className="text-xs font-semibold text-gray-600">Epoch</div>
          <div className="text-xs font-semibold text-gray-600">Dates</div>
          <div className="text-xs font-semibold text-gray-600">Status</div>
          <div className="text-xs font-semibold text-gray-600">Minting Difficulty</div>
        </div>

        {/* Table Rows */}
        <div className="divide-y divide-gray-100">
          {epochs.map((epoch) => {
            const isActive = epoch.isCurrent;
            const dateRange = epoch.startDate && epoch.endDate
              ? `${epoch.startDate} - ${epoch.endDate}`
              : epoch.startDate || "N/A";

            return (
              <div
                key={epoch.epochNumber}
                className={`grid grid-cols-4 gap-4 px-4 py-4 ${
                  isActive ? "bg-[#E8EE58]/20" : "bg-white"
                }`}
              >
                <div className="flex items-center">
                  <span
                    className="text-base font-semibold text-black"
                  >
                    # {epoch.epochNumber}
                  </span>
                </div>
                <div className="flex items-center">
                  <span className="text-sm text-gray-700">{dateRange}</span>
                </div>
                <div className="flex items-center">
                  {isActive ? (
                    <span className="rounded-full bg-green-500 px-3 py-1 text-xs font-medium text-white">
                      Active
                    </span>
                  ) : (
                    <span className="rounded-full bg-red-500 px-3 py-1 text-xs font-medium text-white">
                      Finished
                    </span>
                  )}
                </div>
                <div className="flex flex-col gap-1">
                  <span
                    className="text-sm  text-black"
                  >
                    {epoch.mintingDifficulty}
                  </span>
                  <span className="text-xs text-gray-600">per post/like</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

