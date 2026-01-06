export type FilterType = "all" | "minting" | "transfers";

export interface Transaction {
  id: string;
  type: "minting" | "transfer";
  platform: "x" | "farcaster" | null;
  amount: number;
  status: "pending" | "completed";
  timestamp: Date;
  transferDirection?: "in" | "out";
  transferTime?: string;
}

