"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import { useWalletConnection } from "./useWalletConnection";

export function useUserTransactions(type?: "minting" | "transfer") {
  const { address } = useWalletConnection();

  return useQuery({
    queryKey: ["transactions", address, type],
    queryFn: () => {
      if (!address) throw new Error("Wallet not connected");
      return apiClient.getUserTransactions(address, { limit: 50, type });
    },
    enabled: !!address,
    refetchInterval: 30000, // Refetch every 30 seconds
  });
}
