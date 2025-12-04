"use client";

import Image from "next/image";
import { ChevronDown } from "lucide-react";

interface ProfileHeaderProps {
  balance: string;
}

export function ProfileHeader({ balance }: ProfileHeaderProps) {
  return (
    <div className="px-4 pt-2 pb-4 flex items-center justify-between">
      <h1
        className="text-4xl font-bold text-black"
        style={{ fontFamily: "var(--font-anton), sans-serif" }}
      >
        GM
      </h1>
      
      <div className="flex items-center gap-3">
        {/* Balance pill */}
        <div className="flex items-center gap-2 rounded-full bg-gray-100 px-3 py-1.5">
          <span className="text-base font-bold text-black" style={{ fontFamily: "var(--font-anton), sans-serif" }}>
            {balance}
          </span>
          <Image
            src="/images/coinFace.svg"
            alt="GM Coin"
            width={20}
            height={20}
          />
        </div>
        
        {/* Profile dropdown */}
        <div className="relative">
          <button className="flex items-center gap-1">
            <div className="relative">
              <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 16 16"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M8 8C10.2091 8 12 6.20914 12 4C12 1.79086 10.2091 0 8 0C5.79086 0 4 1.79086 4 4C4 6.20914 5.79086 8 8 8Z"
                    fill="black"
                  />
                  <path
                    d="M8 10C4.68629 10 2 12.6863 2 16H14C14 12.6863 11.3137 10 8 10Z"
                    fill="black"
                  />
                </svg>
              </div>
              <div className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-red-500 rounded-full border-2 border-white"></div>
            </div>
            <ChevronDown className="h-4 w-4 text-black" />
          </button>
        </div>
      </div>
    </div>
  );
}

