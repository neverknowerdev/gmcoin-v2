"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import { useWalletConnection } from "./useWalletConnection";

export function useUserBalance() {
  const { address } = useWalletConnection();

  return useQuery({
    queryKey: ["balance", address],
    queryFn: () => {
      if (!address) throw new Error("Wallet not connected");
      return apiClient.getUserBalance(address);
    },
    enabled: !!address,
    refetchInterval: 30000, // Refetch every 30 seconds
  });
}
