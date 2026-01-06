 "use client";

import { EarnTopTasks } from "@/components/earn/earn-top-tasks";
import { EarnTaskList } from "@/components/earn/earn-task-list";
import { EarnShowcase } from "@/components/earn/earn-showcase";
import { EarnShowUps } from "@/components/earn/earn-show-ups";
import { useState } from "react";

const ESSENTIAL_TASKS = [
  {
    id: "connect-x",
    label: "Connect",
    icon: "/images/xIcon.svg",
    reward: "30 $GM",
  },
  {
    id: "connect-farcaster",
    label: "Connect",
    icon: "/images/farcasterIcon.svg",
    reward: "30 $GM",
  },
  {
    id: "join-x",
    label: "Join GM on X",
    icon: "/images/xIcon.svg",
    reward: "20 $GM",
  },
  {
    id: "join-farcaster",
    label: "Join GM on n",
    icon: "/images/farcasterIcon.svg",
    reward: "20 $GM",
  },
  {
    id: "join-telegram",
    label: "Join GM on Telegram",
    icon: "/images/gmCoin.svg",
    reward: "15 $GM",
  },
  {
    id: "fill-profile",
    label: "Fill your profile",
    icon: "/images/gmMascot.svg",
    reward: "15 $GM",
  },
];

type Screen = "main" | "showups" | "showcase";

export default function EarnPage() {
  const [screen, setScreen] = useState<Screen>("main");

  if (screen === "showups") {
    return (
      <div className="relative flex min-h-screen flex-col px-4 pb-24 pt-6">
        <button
          className="mb-4 flex items-center gap-2 text-sm text-white/80"
          onClick={() => setScreen("main")}
        >
          ← Back
        </button>
        <EarnShowUps />
      </div>
    );
  }

  if (screen === "showcase") {
    return (
      <div className="relative flex min-h-screen flex-col px-4 pb-24 pt-6">
        <button
          className="mb-4 flex items-center gap-2 text-sm text-white/80"
          onClick={() => setScreen("main")}
        >
          ← Back
        </button>
        <EarnShowcase />
      </div>
    );
  }

  return (
    <div className="relative flex min-h-screen flex-col px-4 pb-28 pt-6">
      <section className="space-y-5">
        <EarnTopTasks
          onShowcase={() => setScreen("showcase")}
          onShowUps={() => setScreen("showups")}
        />
        <EarnTaskList title="Essentials" tasks={ESSENTIAL_TASKS} />
      </section>
      <div className="mt-8 flex items-center justify-between rounded-full bg-white/15 px-5 py-3 text-sm text-white shadow-inner">
        <span>Need help completing tasks?</span>
        <button
          className="text-white underline"
          onClick={() => setScreen("showups")}
        >
          View tips
        </button>
      </div>
    </div>
  );
}

