import Image from "next/image";

type StreakCardProps = {
  dayProgress: number[];
  currentStreak: number;
  difficultyLabel: string;
};

const days = [
  { label: "S", id: "sun" },
  { label: "M", id: "mon" },
  { label: "T", id: "tue" },
  { label: "W", id: "wed" },
  { label: "T", id: "thu" },
  { label: "F", id: "fri" },
  { label: "S", id: "sat" },
];
const maxHeight = 180;

export function StreakCard({
  dayProgress,
  currentStreak,
  difficultyLabel,
}: StreakCardProps) {
  return (
    <div className="glass rounded-[28px] border-white/20 bg-white/10 p-6 text-white shadow-[0_20px_60px_rgba(5,19,38,0.35)] backdrop-blur-2xl">
      <div className="flex items-center justify-between text-xs uppercase tracking-[0.3em] text-white/70">
        <span>Streak</span>
        <span>Mint difficulty</span>
      </div>
      <div className="mt-5 flex items-end justify-between gap-2">
        {days.map(({ label, id }, index) => {
          const value = dayProgress[index] ?? 0;
          const height = Math.min(value, maxHeight);
          const active = value > 0;
          return (
            <div key={id} className="flex flex-col items-center gap-2">
              <span className="text-xs text-white/60">{label}</span>
              <div className="h-32 w-4 rounded-full bg-white/10">
                <div
                  className="w-full rounded-full bg-gradient-to-b from-emerald-300 to-amber-300 transition-all"
                  style={{ height: `${(height / maxHeight) * 100}%` }}
                />
              </div>
              <span
                className={`h-1 w-4 rounded-full ${
                  active ? "bg-emerald-300" : "bg-white/20"
                }`}
              />
            </div>
          );
        })}
      </div>
      <div className="mt-6 flex items-center justify-between text-sm font-semibold text-slate-900">
        <div className="rounded-2xl bg-white/85 px-4 py-3">
          <p className="text-xs text-slate-500">Days streak</p>
          <p className="text-lg font-bold">{currentStreak}</p>
        </div>
        <div className="rounded-2xl bg-white/85 px-4 py-3">
          <p className="text-xs text-slate-500">Level</p>
          <p className="text-lg font-bold">{difficultyLabel}</p>
        </div>
      </div>
      <div className="mt-4 flex items-center gap-3 text-sm text-white/80">
        <Image src="/images/gmstreak.svg" alt="Streak mascot" width={48} height={48} />
        <p>Keep the streak alive to earn boosted multipliers.</p>
      </div>
    </div>
  );
}

