"use client";

import { TransactionCard } from "./transaction-card";
import type { Transaction } from "./types";

interface TransactionListProps {
  transactions: Transaction[];
}

export function TransactionList({ transactions }: TransactionListProps) {
  const groupTransactionsByPeriod = (txs: Transaction[]) => {
    if (txs.length === 0) return [];

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

    const groups: { period: string; transactions: Transaction[] }[] = [];
    
    const todayTxs = txs.filter((tx) => {
      const txDate = new Date(tx.timestamp);
      txDate.setHours(0, 0, 0, 0);
      return txDate.getTime() === today.getTime();
    });
    
    const weekTxs = txs.filter((tx) => {
      const txDate = new Date(tx.timestamp);
      txDate.setHours(0, 0, 0, 0);
      return txDate >= weekAgo && txDate < today;
    });
    
    const monthTxs = txs.filter((tx) => {
      const txDate = new Date(tx.timestamp);
      txDate.setHours(0, 0, 0, 0);
      return txDate >= monthAgo && txDate < weekAgo;
    });

    if (todayTxs.length > 0) {
      groups.push({ period: "TODAY", transactions: todayTxs });
    }
    if (weekTxs.length > 0) {
      groups.push({ period: "THIS WEEK", transactions: weekTxs });
    }
    if (monthTxs.length > 0) {
      const monthName = monthAgo.toLocaleString("default", { month: "long" }).toUpperCase();
      groups.push({ period: monthName, transactions: monthTxs });
    }

    return groups;
  };

  const groupedTransactions = groupTransactionsByPeriod(transactions);

  return (
    <div className="relative z-10 px-4 py-6 pb-32">
      {groupedTransactions.map((group) => (
        <div key={group.period} className="mb-6">
          <h2 className="text-xs font-semibold text-gray-500 mb-3 uppercase">
            {group.period}
          </h2>
          <div className="space-y-3">
            {group.transactions.map((tx) => (
              <TransactionCard key={tx.id} transaction={tx} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

