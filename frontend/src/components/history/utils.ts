import type { Transaction } from "./types";

export const getPlatformIcon = (platform: "x" | "farcaster" | null): string | null => {
  if (platform === "x") return "/images/xIcon.svg";
  if (platform === "farcaster") return "/images/farcasterIcon.svg";
  return null;
};

export const getPlatformName = (platform: "x" | "farcaster" | null): string => {
  if (platform === "x") return "X";
  if (platform === "farcaster") return "Farcaster";
  return "";
};

export const getMockTransactions = (): Transaction[] => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const twoDaysAgo = new Date(today);
  twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
  
  const threeDaysAgo = new Date(today);
  threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
  
  const tenDaysAgo = new Date(today);
  tenDaysAgo.setDate(tenDaysAgo.getDate() - 10);
  
  const fifteenDaysAgo = new Date(today);
  fifteenDaysAgo.setDate(fifteenDaysAgo.getDate() - 15);
  
  const twentyDaysAgo = new Date(today);
  twentyDaysAgo.setDate(twentyDaysAgo.getDate() - 20);

  return [
    {
      id: "1",
      type: "minting",
      platform: "x",
      amount: 0,
      status: "pending",
      timestamp: today,
    },
    {
      id: "2",
      type: "minting",
      platform: "farcaster",
      amount: 300,
      status: "completed",
      timestamp: twoDaysAgo,
    },
    {
      id: "3",
      type: "minting",
      platform: "x",
      amount: 200.67,
      status: "completed",
      timestamp: threeDaysAgo,
    },
    {
      id: "4",
      type: "transfer",
      platform: null,
      amount: 300,
      status: "completed",
      timestamp: tenDaysAgo,
      transferDirection: "out",
      transferTime: "08:42 AM",
    },
    {
      id: "5",
      type: "minting",
      platform: "x",
      amount: 200.67,
      status: "completed",
      timestamp: fifteenDaysAgo,
    },
    {
      id: "6",
      type: "minting",
      platform: "farcaster",
      amount: 300,
      status: "completed",
      timestamp: twentyDaysAgo,
    },
  ];
};

