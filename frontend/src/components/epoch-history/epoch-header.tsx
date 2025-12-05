"use client";

import Image from "next/image";
import { Info, List, Table } from "lucide-react";

type ViewMode = "list" | "table";

interface EpochHeaderProps {
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  onHowItWorks?: () => void;
}

export function EpochHeader({ viewMode, onViewModeChange, onHowItWorks }: EpochHeaderProps) {
  return (
    <div className="relative z-10 w-full pt-4 pb-6 mt-20">
      <div className="px-4">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <h1
              className="text-3xl font-bold text-black mb-1"
              style={{ fontFamily: "var(--font-anton), sans-serif" }}
            >
              Epoch History
            </h1>
            <p className="text-sm text-gray-600 mb-3">
              Check all epochs history
            </p>
            <button
              onClick={onHowItWorks}
              className="flex items-center gap-1 rounded-full bg-[#E8EE58] px-3 py-1.5 text-xs font-medium text-black hover:bg-yellow-200 transition"
            >
              <Info className="h-3 w-3" />
              How it works?
            </button>
          </div>
          <div className="flex items-center gap-2">
            <Image
              src="/images/mascot2.svg"
              alt="Sun mascot"
              width={80}
              height={80}
              className="flex-shrink-0"
            />
            <div className="flex items-center gap-1 rounded-full bg-white p-1 shadow-sm border border-gray-100">
              <button
                onClick={() => onViewModeChange("list")}
                className={`p-2 rounded-full transition ${
                  viewMode === "list" ? "bg-[#E8EE58] text-black" : "text-gray-600 hover:bg-gray-50"
                }`}
              >
                <List className="h-4 w-4" />
              </button>
              <button
                onClick={() => onViewModeChange("table")}
                className={`p-2 rounded-full transition ${
                  viewMode === "table" ? "bg-[#E8EE58] text-black" : "text-gray-600 hover:bg-gray-50"
                }`}
              >
                <Table className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

