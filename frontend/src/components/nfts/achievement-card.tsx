import clsx from "clsx";
import type { Achievement } from "./data";

const tierColors: Record<Achievement["tier"], string> = {
  COMMON: "text-sky-200 bg-sky-950/30",
  RARE: "text-purple-200 bg-purple-950/30",
  LEGENDARY: "text-amber-200 bg-amber-950/30",
  EPIC: "text-rose-200 bg-rose-950/30",
};

interface AchievementCardProps {
  achievement: Achievement;
}

export function AchievementCard({ achievement }: AchievementCardProps) {
  return (
    <article className="relative overflow-hidden rounded-3xl border border-white/15 bg-white/10 p-4 text-white shadow-2xl shadow-black/30 backdrop-blur-lg">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold">{achievement.title}</h3>
          <p className="text-sm text-white/75">{achievement.subtitle}</p>
        </div>
        <span
          className={clsx(
            "rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide",
            tierColors[achievement.tier]
          )}
        >
          {achievement.tier}
        </span>
      </div>

      <p className="text-sm text-white/70">{achievement.description}</p>

      <div className="mt-4">
        <p className="text-xs uppercase tracking-widest text-white/60">
          {achievement.progressLabel}
        </p>
        <div className="mt-2 h-2.5 rounded-full bg-white/15">
          <div
            className="h-full rounded-full bg-gradient-to-r from-white via-sky-200 to-emerald-300"
            style={{ width: `${achievement.progress}%` }}
          />
        </div>
      </div>

      {achievement.meta && (
        <p className="mt-3 text-xs text-white/65">{achievement.meta}</p>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        {achievement.perks.map((perk) => (
          <span
            key={perk}
            className="rounded-full bg-white/15 px-3 py-1 text-xs font-semibold text-white/80"
          >
            {perk}
          </span>
        ))}
      </div>

      <div className="mt-5 flex flex-wrap gap-3">
        {achievement.secondaryCtaLabel && (
          <button
            type="button"
            className="flex-1 rounded-2xl border border-white/30 px-4 py-2 text-sm font-semibold text-white/85"
          >
            {achievement.secondaryCtaLabel}
          </button>
        )}
        <button
          type="button"
          className={clsx(
            "flex-1 rounded-2xl px-4 py-2 text-sm font-semibold transition",
            achievement.ctaDisabled
              ? "bg-white/20 text-white/60"
              : "bg-black/80 text-white shadow-lg"
          )}
        >
          {achievement.ctaLabel}
        </button>
      </div>
    </article>
  );
}

