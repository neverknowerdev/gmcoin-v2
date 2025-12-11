"use client";

import { useState, useMemo } from "react";
import { HistoryBackground } from "@/components/history/history-background";
import { HistoryBalanceSection } from "@/components/history/balance-section";
import { useUserBalance } from "@/hooks/useBalance";
import { HistoryHeader } from "@/components/history/history-header";
import { TransactionList } from "@/components/history/transaction-list";
import { useUserTransactions } from "@/hooks/useTransactions";
import type { FilterType } from "@/components/history/types";

export default function HistoryPage() {
  const [filter, setFilter] = useState<FilterType>("all");
  const { data: transactions = [], isLoading } = useUserTransactions();
  const { data: balanceData } = useUserBalance();

  const filteredTransactions = useMemo(() => {
    // Map API transactions to component format
    const mappedTransactions = transactions.map((tx) => ({
      id: tx.id,
      type: tx.type as "minting" | "transfer",
      platform: (tx.platform === "twitter" ? "x" : tx.platform === "farcaster" ? "farcaster" : null) as "x" | "farcaster" | null,
      amount: parseFloat(tx.amount),
      status: tx.status as "pending" | "completed",
      timestamp: new Date(tx.timestamp),
      transferDirection: tx.transferDirection as "in" | "out" | undefined,
      transferTime: tx.transferTime,
    }));

    return mappedTransactions.filter((tx) => {
      if (filter === "all") return true;
      if (filter === "minting") return tx.type === "minting";
      if (filter === "transfers") return tx.type === "transfer";
      return true;
    });
  }, [transactions, filter]);

  if (isLoading) {
    return (
      <div className="min-h-screen relative flex items-center justify-center">
        <HistoryBackground />
        <div className="text-white text-xl">Loading transactions...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative">
      <HistoryBackground />
      <HistoryBalanceSection balance={balanceData?.balance || "0 GM"} />
      <HistoryHeader filter={filter} onFilterChange={setFilter} />
      <TransactionList transactions={filteredTransactions} />
    </div>
  );
}
