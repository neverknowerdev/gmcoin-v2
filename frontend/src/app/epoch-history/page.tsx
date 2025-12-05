"use client";

import { useState } from "react";
import { EpochBackground } from "@/components/epoch-history/epoch-background";
import { EpochHeader } from "@/components/epoch-history/epoch-header";
import { EpochList } from "@/components/epoch-history/epoch-list";
import { EpochTable } from "@/components/epoch-history/epoch-table";

type ViewMode = "list" | "table";

export default function EpochHistoryPage() {
  const [viewMode, setViewMode] = useState<ViewMode>("list");

  // Mock data - replace with real data later
  const epochs = [
    {
      epochNumber: 12,
      isCurrent: true,
      currentDay: 4,
      totalDays: 7,
      startDate: "01",
      endDate: "07 Aug 2025",
      mintingDifficulty: "120 GM",
    },
    {
      epochNumber: 11,
      startDate: "01",
      endDate: "07 Aug 2025",
      mintingDifficulty: "120 GM",
    },
    {
      epochNumber: 10,
      startDate: "01",
      endDate: "07 Aug 2025",
      mintingDifficulty: "120 GM",
    },
    {
      epochNumber: 9,
      startDate: "01",
      endDate: "07 Aug 2025",
      mintingDifficulty: "120 GM",
    },
    {
      epochNumber: 8,
      startDate: "01",
      endDate: "07 Aug 2025",
      mintingDifficulty: "120 GM",
    },
    {
      epochNumber: 7,
      startDate: "01",
      endDate: "07 Aug 2025",
      mintingDifficulty: "120 GM",
    },
    {
      epochNumber: 6,
      startDate: "01",
      endDate: "07 Aug 2025",
      mintingDifficulty: "120 GM",
    },
    {
      epochNumber: 5,
      startDate: "01",
      endDate: "07 Aug 2025",
      mintingDifficulty: "120 GM",
    },
    {
      epochNumber: 4,
      startDate: "01",
      endDate: "07 Aug 2025",
      mintingDifficulty: "120 GM",
    },
    {
      epochNumber: 3,
      startDate: "01",
      endDate: "07 Aug 2025",
      mintingDifficulty: "120 GM",
    },
    {
      epochNumber: 2,
      startDate: "01",
      endDate: "07 Aug 2025",
      mintingDifficulty: "210 GM",
    },
    {
      epochNumber: 1,
      startDate: "01",
      endDate: "07 Aug 2025",
      mintingDifficulty: "200 GM",
    },
  ];

  return (
    <div className="min-h-screen relative">
      <EpochBackground />
      <EpochHeader
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        onHowItWorks={() => console.log("How it works clicked")}
      />
      {viewMode === "list" ? (
        <EpochList
          epochs={epochs}
          onHowItWorks={() => console.log("How it works clicked")}
        />
      ) : (
        <EpochTable epochs={epochs} />
      )}
    </div>
  );
}

