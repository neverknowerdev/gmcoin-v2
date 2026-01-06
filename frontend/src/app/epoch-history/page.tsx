"use client";

import { useState } from "react";
import { EpochBackground } from "@/components/epoch-history/epoch-background";
import { EpochHeader } from "@/components/epoch-history/epoch-header";
import { EpochList } from "@/components/epoch-history/epoch-list";
import { EpochTable } from "@/components/epoch-history/epoch-table";
import { useEpochs } from "@/hooks/useEpochs";

type ViewMode = "list" | "table";

export default function EpochHistoryPage() {
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const { data: epochs, isLoading, error } = useEpochs(50);

  if (isLoading) {
    return (
      <div className="min-h-screen relative flex items-center justify-center">
        <EpochBackground />
        <div className="text-white text-xl">Loading epochs...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen relative flex items-center justify-center">
        <EpochBackground />
        <div className="text-red-500 text-xl">Error loading epochs</div>
      </div>
    );
  }

  // Format dates for display
  const formattedEpochs = (epochs || []).map((epoch) => {
    const startDate = new Date(epoch.startDate);
    const endDate = epoch.endDate ? new Date(epoch.endDate) : null;
    
    return {
      ...epoch,
      startDate: startDate.getDate().toString().padStart(2, '0'),
      endDate: endDate 
        ? `${endDate.getDate().toString().padStart(2, '0')} ${endDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}`
        : undefined,
      currentDay: epoch.currentDay ?? undefined,
    };
  });

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
          epochs={formattedEpochs}
          onHowItWorks={() => console.log("How it works clicked")}
        />
      ) : (
        <EpochTable epochs={formattedEpochs} />
      )}
    </div>
  );
}

