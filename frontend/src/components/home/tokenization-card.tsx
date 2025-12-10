type TokenizationCardProps = {
  percentage: number;
  gmOnX: string;
  gmOnFarcaster: string;
  historical: number[];
};

const MAX_VALUE = 100;

export function TokenizationCard({
  percentage,
  gmOnX,
  gmOnFarcaster,
  historical,
}: TokenizationCardProps) {
  const sparklinePath = historical
    .map((value, index) => {
      const x = (index / (historical.length - 1)) * 100;
      const y = 100 - Math.min(value, MAX_VALUE);
      return `${index === 0 ? "M" : "L"} ${x},${y}`;
    })
    .join(" ");

  return (
    <div className="glass rounded-[32px] border-white/20 bg-gradient-to-br from-white/15 to-white/5 p-6 text-white shadow-[0_30px_80px_rgba(3,7,18,0.45)] backdrop-blur-2xl">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.35em] text-white/70">
            Tokenization %
          </p>
          <p className="mt-1 text-4xl font-semibold">{percentage}%</p>
        </div>
        <span className="rounded-full bg-white/10 px-3 py-1 text-xs text-white/80">
          Total GMs
        </span>
      </div>

      <div className="mt-4 h-28 rounded-[26px] bg-white/10 px-3 py-4">
        <svg viewBox="0 0 100 100" className="h-full w-full">
          <defs>
            <linearGradient id="gmLine" x1="0" y1="0" x2="100" y2="0">
              <stop offset="0%" stopColor="#FFB347" />
              <stop offset="100%" stopColor="#F97316" />
            </linearGradient>
          </defs>
          <path
            d={sparklinePath}
            stroke="url(#gmLine)"
            strokeWidth="4"
            fill="none"
            strokeLinecap="round"
          />
          {historical.map((value, index) => {
            const cx = (index / (historical.length - 1)) * 100;
            const cy = 100 - Math.min(value, MAX_VALUE);
            return (
              <circle
                key={`${value}-${index}`}
                cx={cx}
                cy={cy}
                r={3.5}
                fill="#FFB347"
                stroke="white"
                strokeWidth={1}
              />
            );
          })}
        </svg>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3 text-center text-slate-900">
        <div className="rounded-2xl border border-white/40 bg-white/85 px-4 py-3 shadow-inner">
          <p className="text-xs uppercase tracking-[0.25em] text-slate-500">
            GMs on X
          </p>
          <p className="text-2xl font-semibold">{gmOnX}</p>
        </div>
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-amber-800 shadow-inner">
          <p className="text-xs uppercase tracking-[0.25em] text-amber-500">
            GMs on n
          </p>
          <p className="text-2xl font-semibold">{gmOnFarcaster}</p>
        </div>
      </div>

      <button className="mt-4 text-xs font-semibold text-white/85 underline underline-offset-4">
        About Farcaster?
      </button>
    </div>
  );
}

