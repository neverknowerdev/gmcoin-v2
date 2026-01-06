"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";

export function useLeaderboard(limit: number = 100) {
  return useQuery({
    queryKey: ["leaderboard", limit],
    queryFn: () => apiClient.getLeaderboard(limit),
    refetchInterval: 60000, // Refetch every minute
  });
}
