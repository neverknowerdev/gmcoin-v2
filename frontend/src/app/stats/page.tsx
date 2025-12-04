"use client";

import { GlobalStatistic } from "@/components/stats/global-statistic";
import { TokenizationCardNew } from "@/components/home/tokenization-card-new";
import { DailyTokenization } from "@/components/stats/daily-tokenization";
import { GMSources } from "@/components/stats/gm-sources";
import { EpochCard } from "@/components/home/epoch-card";

export default function StatsPage() {
  // Mock data - replace with real data later
  const dailyTokenizationData = [45, 62, 55, 68, 57, 66, 70];
  const gmSources = [
    { platform: "x" as const, percentage: 68 },
    { platform: "farcaster" as const, percentage: 32 },
  ];

  return (
    <div className="min-h-screen bg-white pb-32">
      <GlobalStatistic
        totalTokenized="32,822"
        totalUsers="54,243"
        usersToday="+234"
      />
      
      <TokenizationCardNew
        percentage={80}
        growthToday={12}
        historical={[45, 62, 55, 68, 57, 66, 70, 75, 80]}
        onViewStats={() => console.log("View detailed statistics")}
      />
      
      <DailyTokenization data={dailyTokenizationData} />
      
      <GMSources sources={gmSources} />
      
      <EpochCard
        epochNumber={12}
        currentDay={4}
        totalDays={7}
        mintingDifficulty="100 GM"
        onHowItWorks={() => console.log("How it works clicked")}
        onViewHistory={() => console.log("View epoch history")}
      />
    </div>
  );
}
