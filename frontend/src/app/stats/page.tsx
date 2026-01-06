"use client";

import { GlobalStatistic } from "@/components/stats/global-statistic";
import { TokenizationCardNew } from "@/components/home/tokenization-card-new";
import { DailyTokenization } from "@/components/stats/daily-tokenization";
import { GMSources } from "@/components/stats/gm-sources";
import { EpochCard } from "@/components/home/epoch-card";
import { useGlobalStats, useDailyStats } from "@/hooks/useStats";
import { useCurrentEpoch } from "@/hooks/useEpochs";

export default function StatsPage() {
  const { data: globalStats, isLoading: statsLoading } = useGlobalStats();
  const { data: dailyStats = [], isLoading: dailyLoading } = useDailyStats(7);
  const { data: currentEpoch, isLoading: epochLoading } = useCurrentEpoch();

  // Format numbers for display
  const formatNumber = (num: string | number) => {
    const n = typeof num === 'string' ? parseFloat(num) : num;
    if (isNaN(n)) return "0";
    return Math.floor(n).toLocaleString('en-US');
  };

  // Calculate growth percentage from daily stats
  const calculateGrowth = () => {
    if (dailyStats.length < 2) return 0;
    const today = dailyStats[dailyStats.length - 1];
    const yesterday = dailyStats[dailyStats.length - 2];
    if (yesterday === 0) return 0;
    return Math.round(((today - yesterday) / yesterday) * 100);
  };

  // Calculate total percentage (for tokenization card)
  const calculateTotalPercentage = () => {
    if (!globalStats) return 0;
    const total = parseFloat(globalStats.totalTokenized);
    // This is a simplified calculation - you might want to adjust based on your tokenomics
    return Math.min(100, Math.round((total / 1000000) * 100)); // Assuming 1M as max
  };

  const gmSources = globalStats ? [
    { platform: "x" as const, percentage: Math.round(globalStats.twitterPercentage) },
    { platform: "farcaster" as const, percentage: Math.round(globalStats.farcasterPercentage) },
  ] : [
    { platform: "x" as const, percentage: 0 },
    { platform: "farcaster" as const, percentage: 0 },
  ];

  if (statsLoading || dailyLoading || epochLoading) {
    return (
      <div className="min-h-screen bg-white pb-32 flex items-center justify-center">
        <div className="text-xl">Loading statistics...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white pb-32">
      <GlobalStatistic
        totalTokenized={formatNumber(globalStats?.totalTokenized || "0")}
        totalUsers={formatNumber(globalStats?.totalUsers || 0)}
        usersToday={`+${formatNumber(globalStats?.usersToday || 0)}`}
      />
      
      <TokenizationCardNew
        percentage={calculateTotalPercentage()}
        growthToday={calculateGrowth()}
        historical={dailyStats.map(d => Math.round(d))}
        onViewStats={() => console.log("View detailed statistics")}
      />
      
      <DailyTokenization data={dailyStats.map(d => Math.round(d))} />
      
      <GMSources sources={gmSources} />
      
      {currentEpoch && (
      <EpochCard
          epochNumber={currentEpoch.epochNumber}
          currentDay={currentEpoch.currentDay}
          totalDays={currentEpoch.totalDays}
          mintingDifficulty={currentEpoch.mintingDifficulty}
        onHowItWorks={() => console.log("How it works clicked")}
        onViewHistory={() => console.log("View epoch history")}
      />
      )}
    </div>
  );
}
