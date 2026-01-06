"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";

export function useGlobalStats() {
  return useQuery({
    queryKey: ["stats", "global"],
    queryFn: () => apiClient.getGlobalStats(),
    refetchInterval: 60000, // Refetch every minute
  });
}

export function useDailyStats(days: number = 7) {
  return useQuery({
    queryKey: ["stats", "daily", days],
    queryFn: () => apiClient.getDailyStats(days),
    refetchInterval: 60000,
  });
}
