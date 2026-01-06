import clsx from "clsx";

const tabs = [
  { id: "posts", label: "Posts" },
  { id: "profiles", label: "Profiles" },
];

const mockPosts = [
  {
    id: 1,
    author: "@cornerstone",
    platform: "Farcaster",
    content: "Kicking off the day with a GM 🌞. Shipping small things beats stalling.",
    reactions: { likes: 31, comments: 6, recasts: 3 },
  },
  {
    id: 2,
    author: "@enyphil_hazade",
    platform: "X",
    content: "Sketching a compact card layout for our miniapp. Keep it playful.",
    reactions: { likes: 18, comments: 4, recasts: 2 },
  },
  {
    id: 3,
    author: "@kamxwell",
    platform: "X",
    content: "Docs update live. Ping me feedback.",
    reactions: { likes: 19, comments: 3, recasts: 1 },
  },
];

export function EarnShowUps() {
  return (
    <div className="space-y-4">
      <header className="glass rounded-[32px] border-white/30 bg-white/12 p-6 text-white shadow-[0_25px_70px_rgba(6,17,38,0.45)] backdrop-blur-2xl">
        <div className="flex items-center justify-between text-sm">
          <span>Eligibility:</span>
          <span className="font-semibold text-rose-400">✗ Not Eligible</span>
          <button className="text-white/80 underline">Why?</button>
        </div>
        <div className="mt-4 flex items-center justify-between text-xs text-white/80">
          <div className="flex items-center gap-3">
            <span>🪪</span>
            <span>X + n</span>
            <span>☀️</span>
            <span>30 days streak</span>
          </div>
          <span>▼</span>
        </div>
        <div className="mt-4 flex items-center justify-between rounded-[24px] bg-white/10 px-4 py-3">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-white/70">
              Points diff
            </p>
            <p className="text-2xl font-semibold">+18</p>
          </div>
          <div className="text-xs text-white/70">
            <p>Given: 114</p>
            <p>Received: 96</p>
          </div>
          <button className="text-xs text-white underline">How it works</button>
        </div>
      </header>

      <div className="rounded-[999px] border border-white/30 bg-white/10 p-1 text-xs text-white shadow-inner">
        <div className="grid grid-cols-2 gap-1">
          {tabs.map((tab, idx) => (
            <button
              key={tab.id}
              className={clsx(
                "rounded-full px-4 py-2 font-semibold",
                idx === 0 ? "bg-white/80 text-slate-900" : "text-white/70"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        {mockPosts.map((post) => (
          <div
            key={post.id}
            className="glass rounded-[24px] border-white/20 bg-white/10 p-4 text-white shadow-[0_20px_60px_rgba(5,19,38,0.4)] backdrop-blur-2xl"
          >
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <span className="font-semibold">{post.author}</span>
                <span className="rounded-full bg-white/15 px-2 py-0.5 text-xs text-white/70">
                  {post.platform}
                </span>
              </div>
              <button className="text-xs text-white/80 underline">
                Open {post.platform === "X" ? "Tweet" : "Cast"}
              </button>
            </div>
            <p className="mt-3 text-sm text-white/85">{post.content}</p>
            <div className="mt-4 flex items-center gap-4 text-xs text-white/70">
              <span>💛 {post.reactions.likes}</span>
              <span>💬 {post.reactions.comments}</span>
              <span>🔄 {post.reactions.recasts}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

