"use client";

import Image from "next/image";

interface StreakCardNewProps {
  streakDays: number;
  percentile: number;
  dayProgress: {
    day: string;
    completed: boolean;
    isToday?: boolean;
  }[];
}

export function StreakCardNew({
  streakDays,
  percentile,
  dayProgress,
}: StreakCardNewProps) {
  const daysOfWeek = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

  return (
    <div className="mx-4 mb-4 rounded-2xl bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="text-2xl font-bold text-black" style={{ fontFamily: "var(--font-anton), sans-serif" }}>{streakDays} days streak</p>
          <p className="text-sm text-gray-600 mt-1">You&apos;re in {percentile}% users!</p>
        </div>
        <Image
          src="/images/mascot2.svg"
          alt="Sun mascot"
          width={80}
          height={80}
          className="flex-shrink-0"
        />
      </div>
      <div className="space-y-3">
        <div className="flex items-center justify-between text-xs text-gray-500">
          {daysOfWeek.map((day) => (
            <span key={day}>{day}</span>
          ))}
        </div>
        <div className="flex items-center justify-between">
          {dayProgress.map((day, index) => (
            <div key={index} className="flex flex-col items-center gap-1">
              {day.completed ? (
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-yellow-400">
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 20 20"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M16.6667 5L7.50004 14.1667L3.33337 10"
                      stroke="black"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
              ) : day.isToday ? (
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100">
                  <Image
                    src="/images/coinFace.svg"
                    alt="Sun"
                    width={50}
                    height={50}
                  />
                </div>
              ) : (
                <div className="h-10 w-10 rounded-full bg-gray-100" />
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

