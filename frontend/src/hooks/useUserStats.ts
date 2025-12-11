"use client";

import { useMemo } from "react";
import { useUserBalance } from "./useBalance";
import { useLeaderboard } from "./useLeaderboard";
import { useUserTransactions } from "./useTransactions";
import { useWalletConnection } from "./useWalletConnection";

/**
 * Calculate user rank from leaderboard
 */
export function useUserRank() {
  const { address } = useWalletConnection();
  const { data: leaderboard = [] } = useLeaderboard(1000); // Get enough entries to find user

  const rank = useMemo(() => {
    if (!address) return undefined;
    const userEntry = leaderboard.find(
      (entry) => entry.wallet.toLowerCase() === address.toLowerCase()
    );
    return userEntry?.rank;
  }, [address, leaderboard]);

  return { rank };
}

/**
 * Calculate streak from transactions
 * Streak is calculated as consecutive days with minting transactions
 */
export function useUserStreak() {
  const { data: transactions = [] } = useUserTransactions("minting");

  const streakData = useMemo(() => {
    // Get unique dates with minting transactions
    const datesWithActivity = new Set<string>();
    transactions.forEach((tx) => {
      const date = new Date(tx.timestamp);
      const dateStr = date.toISOString().split("T")[0];
      datesWithActivity.add(dateStr);
    });

    // Calculate current streak (consecutive days from today backwards)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    let streakDays = 0;
    let checkDate = new Date(today);

    while (datesWithActivity.has(checkDate.toISOString().split("T")[0])) {
      streakDays++;
      checkDate.setDate(checkDate.getDate() - 1);
    }

    // Generate week progress (last 7 days)
    const weekProgress = [];
    const dayNames = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
    const todayDayOfWeek = today.getDay();

    for (let i = 6; i >= 0; i--) {
      const checkDate = new Date(today);
      checkDate.setDate(checkDate.getDate() - i);
      const dateStr = checkDate.toISOString().split("T")[0];
      const dayIndex = (todayDayOfWeek - i + 7) % 7;
      
      weekProgress.push({
        day: dayNames[dayIndex],
        completed: datesWithActivity.has(dateStr),
        isToday: i === 0,
      });
    }

    return {
      streakDays,
      weekProgress,
    };
  }, [transactions]);

  return streakData;
}
