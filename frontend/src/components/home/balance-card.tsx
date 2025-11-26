type BalanceCardProps = {
  balance: string;
  change: string;
  onBuy: () => void;
  onSell: () => void;
  onSwap: () => void;
  onMore: () => void;
};

const actions = ["Buy", "Sell", "Swap", "More"] as const;

export function BalanceCard({
  balance,
  change,
  onBuy,
  onSell,
  onSwap,
  onMore,
}: BalanceCardProps) {
  const handlers = {
    Buy: onBuy,
    Sell: onSell,
    Swap: onSwap,
    More: onMore,
  } as const;

  return (
    <div className="glass rounded-[28px] border-white/30 bg-white/12 px-5 py-6 text-white shadow-[0_20px_60px_rgba(5,19,38,0.35)] backdrop-blur-2xl">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-3xl font-semibold">{balance}</p>
        </div>
        <span className="rounded-full bg-emerald-400/20 px-3 py-1 text-xs font-semibold text-emerald-200">
          {change}
        </span>
      </div>
      <div className="mt-5 grid grid-cols-4 gap-2 text-xs font-semibold text-slate-900">
        {actions.map((label) => (
          <button
            key={label}
            onClick={handlers[label]}
            className="glass rounded-full border border-white/30 p-2 text-center shadow-inner"
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}

