import Image from "next/image";

type ShowcaseCardProps = {
  title: string;
  icon: string;
  description: string;
  actions: { label: string; href: string }[];
};

const SHOWCASE_DATA: ShowcaseCardProps = {
  title: "GM Daily Show-ups",
  icon: "/images/gmCup2.svg",
  description: "Complete your daily GM rituals to stack points faster.",
  actions: [
    { label: "Posts", href: "#posts" },
    { label: "Profiles", href: "#profiles" },
  ],
};

export function EarnShowcase() {
  return (
    <div className="space-y-4">
      <button className="flex items-center gap-2 text-sm text-white/80">
        ← Back
      </button>
      <div className="glass rounded-[32px] border-white/30 bg-gradient-to-br from-white/15 to-white/5 p-6 text-white shadow-[0_30px_80px_rgba(6,17,38,0.45)] backdrop-blur-2xl">
        <div className="flex items-center gap-3">
          <Image
            src={SHOWCASE_DATA.icon}
            alt={SHOWCASE_DATA.title}
            width={56}
            height={56}
          />
          <div>
            <h3 className="text-xl font-semibold">{SHOWCASE_DATA.title}</h3>
            <p className="text-sm text-white/70">{SHOWCASE_DATA.description}</p>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3 text-center text-slate-900">
          {SHOWCASE_DATA.actions.map((action) => (
            <button
              key={action.label}
              className="rounded-full border border-white/40 bg-white/80 px-4 py-3 text-sm font-semibold shadow-inner"
            >
              {action.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

