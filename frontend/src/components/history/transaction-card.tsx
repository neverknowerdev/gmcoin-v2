"use client";

import Image from "next/image";
import { ArrowUp, ArrowDown } from "lucide-react";
import type { Transaction } from "./types";
import { getPlatformIcon, getPlatformName } from "./utils";

interface TransactionCardProps {
  transaction: Transaction;
}

export function TransactionCard({ transaction: tx }: TransactionCardProps) {
  const iconSrc = tx.type === "transfer" ? null : getPlatformIcon(tx.platform);
  const platformName = tx.type === "transfer"
    ? tx.transferTime || ""
    : getPlatformName(tx.platform);

  return (
    <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 flex items-center gap-3">
      {tx.type === "transfer" ? (
        tx.transferDirection === "out" ? (
          <ArrowUp className="w-6 h-6 text-black" />
        ) : (
          <ArrowDown className="w-6 h-6 text-black" />
        )
      ) : iconSrc ? (
        <Image
          src={iconSrc}
          alt={platformName}
          width={24}
          height={24}
        />
      ) : null}
      <div className="flex-1">
        <p className="font-semibold text-black">
          {tx.type === "transfer"
            ? `Transfer ${tx.transferDirection === "out" ? "out" : "in"}`
            : "Minting"}
        </p>
        <p className="text-xs text-gray-600">{platformName}</p>
      </div>
      <div className="flex items-center gap-2">
        {tx.status === "pending" ? (
          <>
            <span className="text-xl text-gray-500" style={{ fontFamily: "var(--font-anton), sans-serif" }}>PENDING</span>
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <circle cx="8" cy="8" r="7" stroke="#9CA3AF" strokeWidth="1.5" />
              <path
                d="M8 4V8M8 12H8.01"
                stroke="#9CA3AF"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
          </>
        ) : (
          <span
            className={`text-xl font-bold ${
              tx.type === "transfer" && tx.transferDirection === "out"
                ? "text-[#FF0000]"
                : "text-[#65CC32]"
            }`}
            style={{ fontFamily: "var(--font-anton), sans-serif" }}
          >
            {tx.type === "transfer" && tx.transferDirection === "out" ? "-" : "+"}
            {tx.amount.toFixed(2)} GM
          </span>
        )}
      </div>
    </div>
  );
}

