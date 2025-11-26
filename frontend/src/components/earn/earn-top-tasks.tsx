import Image from "next/image";

type EarnTopTasksProps = {
  onShowcase: () => void;
  onShowUps: () => void;
};

const TOP_TASKS = [
  {
    id: "gm-showcase",
    title: "GM Showcase",
    icon: "/images/gmCoin.svg",
    action: "showcase",
  },
  {
    id: "gm-daily",
    title: "GM Daily Show-ups",
    icon: "/images/gmCup2.svg",
    action: "showups",
  },
] as const;

export function EarnTopTasks({ onShowcase, onShowUps }: EarnTopTasksProps) {
  const handlers = {
    showcase: onShowcase,
    showups: onShowUps,
  } as const;

  return (
    <div className="space-y-3">
      <p className="text-sm font-semibold uppercase tracking-[0.3em] text-white">
        Top Tasks
      </p>
      <div className="space-y-3">
        {TOP_TASKS.map((task) => (
          <button
            key={task.id}
            onClick={handlers[task.action]}
            className="glass flex w-full items-center justify-between rounded-[26px] border border-white/40 bg-white/12 px-5 py-4 text-white shadow-[0_25px_80px_rgba(3,7,18,0.4)] backdrop-blur-2xl"
          >
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-white/10 p-2">
                <Image
                  src={task.icon}
                  alt={task.title}
                  width={24}
                  height={24}
                />
              </div>
              <span className="text-base font-semibold">{task.title}</span>
            </div>
            <span className="text-xl">➜</span>
          </button>
        ))}
      </div>
    </div>
  );
}

