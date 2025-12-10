"use client";

import Image from "next/image";
import { useState } from "react";
import { NftTabSwitch } from "./nft-tab-switch";
import { NftGrid } from "./nft-grid";
import { AchievementList } from "./achievement-list";

type TabKey = "nfts" | "achievements";

export function NftExperience() {
  const [tab, setTab] = useState<TabKey>("nfts");

  return (
    <div className="relative mx-auto max-w-md px-4 pb-32 pt-10">
      <Image
        src="/images/Ellipse.svg"
        alt="Gradient ellipse overlay"
        fill
        className="ellipse-overlay object-cover"
        priority
      />
      <NftTabSwitch active={tab} onChange={setTab} />
      {tab === "nfts" ? <NftGrid /> : <AchievementList />}
    </div>
  );
}

