import Image from "next/image";

type Task = {
  id: string;
  label: string;
  icon: string;
  reward: string;
};

type EarnTaskListProps = {
  title: string;
  tasks: Task[];
};

export function EarnTaskList({ title, tasks }: EarnTaskListProps) {
  return (
    <div className="space-y-3">
      <p className="text-sm font-semibold uppercase tracking-[0.3em] text-white">
        {title}
      </p>
      <div className="space-y-2">
        {tasks.map((task) => (
          <button
            key={task.id}
            className="glass flex w-full items-center justify-between rounded-[26px] border border-white/35 bg-white/10 px-4 py-3 text-white shadow-[0_20px_60px_rgba(3,7,18,0.35)] backdrop-blur-2xl transition hover:bg-white/15"
          >
            <div className="flex items-center gap-3">
              <Image src={task.icon} alt={task.label} width={22} height={22} />
              <span className="text-sm font-semibold">{task.label}</span>
            </div>
            <span className="text-xs font-semibold text-amber-200">
              {task.reward}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

