"use client";

interface DailyTokenizationProps {
  data: number[];
}

export function DailyTokenization({ data }: DailyTokenizationProps) {
  const maxValue = Math.max(...data, 1);
  const points = data.map((value, index) => {
    const x = (index / (data.length - 1)) * 100;
    const y = 100 - (value / maxValue) * 100;
    return `${index === 0 ? "M" : "L"} ${x},${y}`;
  }).join(" ");

  return (
    <div className="mx-4 mb-4 rounded-2xl bg-white p-5 shadow-sm">
      <h2
        className="text-2xl font-bold text-black mb-4"
        style={{ fontFamily: "var(--font-anton), sans-serif" }}
      >
        Daily Tokenization
      </h2>
      
      {/* Chart */}
      <div className="h-48 mb-3 bg-gray-50 rounded-lg p-4">
        <svg viewBox="0 0 100 100" className="w-full h-full" preserveAspectRatio="none">
          <path
            d={points}
            stroke="#65CC32"
            strokeWidth="2"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d={`${points} L 100,100 L 0,100 Z`}
            fill="url(#dailyGradient)"
            opacity="0.2"
          />
          <defs>
            <linearGradient id="dailyGradient" x1="0" y1="0" x2="0" y2="100">
              <stop offset="0%" stopColor="#65CC32" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#65CC32" stopOpacity="0" />
            </linearGradient>
          </defs>
          
          {/* X-axis labels */}
          {data.map((_, index) => {
            const x = (index / (data.length - 1)) * 100;
            return (
              <text
                key={index}
                x={x}
                y="95"
                fontSize="8"
                fill="#6B7280"
                textAnchor="middle"
              >
                D{index * 2 + 1}
              </text>
            );
          })}
        </svg>
      </div>
      
      <p className="text-xs text-gray-500 text-center">
        Higher = more GMs processed today
      </p>
    </div>
  );
}

