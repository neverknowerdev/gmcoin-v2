"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";

export function useCurrentEpoch() {
  return useQuery({
    queryKey: ["epoch", "current"],
    queryFn: () => apiClient.getCurrentEpoch(),
    refetchInterval: 60000, // Refetch every minute
  });
}

export function useEpochs(limit?: number) {
  return useQuery({
    queryKey: ["epochs", limit],
    queryFn: () => apiClient.getEpochs(limit),
    refetchInterval: 60000,
  });
}
