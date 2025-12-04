"use client";

import { useState, useMemo } from "react";
import { HistoryBackground } from "@/components/history/history-background";
import { HistoryBalanceSection } from "@/components/history/balance-section";
import { HistoryHeader } from "@/components/history/history-header";
import { TransactionList } from "@/components/history/transaction-list";
import { getMockTransactions } from "@/components/history/utils";
import type { FilterType } from "@/components/history/types";

export default function HistoryPage() {
  const [filter, setFilter] = useState<FilterType>("all");

  const transactions = getMockTransactions();

  const filteredTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      if (filter === "all") return true;
      if (filter === "minting") return tx.type === "minting";
      if (filter === "transfers") return tx.type === "transfer";
      return true;
    });
  }, [transactions, filter]);

  return (
    <div className="min-h-screen relative">
      <HistoryBackground />
      <HistoryBalanceSection />
      <HistoryHeader filter={filter} onFilterChange={setFilter} />
      <TransactionList transactions={filteredTransactions} />
    </div>
  );
}
