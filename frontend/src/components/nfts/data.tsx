export type NftItem = {
  id: string;
  title: string;
  subtitle: string;
  price: string;
  accent: string;
  badge?: "add" | "owned";
};

export type Achievement = {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  tier: "COMMON" | "RARE" | "LEGENDARY" | "EPIC";
  progress: number;
  progressLabel: string;
  perks: string[];
  meta?: string;
  ctaLabel: string;
  ctaDisabled?: boolean;
  secondaryCtaLabel?: string;
};

export const nftCatalog: Record<"earnable" | "grabs" | "acquired", NftItem[]> =
  {
    earnable: [
      {
        id: "streak-30",
        title: "30 Days Streak",
        subtitle: "Stay sunny for 30 mornings",
        price: "1,500 $GM",
        accent: "from-[#8cd8ff] to-[#33a2ff]",
      },
      {
        id: "streak-150",
        title: "150 Days Streak",
        subtitle: "Legendary steadfast vibes",
        price: "1,500 $GM",
        accent: "from-[#ffe59a] to-[#f6b042]",
      },
      {
        id: "first-150",
        title: "First 150 Buyers",
        subtitle: "OG supporter edition",
        price: "1,500 $GM",
        accent: "from-[#ffd1ff] to-[#f88ac1]",
      },
    ],
    grabs: [
      {
        id: "sunny-smile",
        title: "Sunny Smile NFT",
        subtitle: "Limited booster",
        price: "7,800 $GM",
        accent: "from-[#8cd8ff] to-[#33a2ff]",
        badge: "add",
      },
      {
        id: "sad-faced",
        title: "Sad Faced NFT",
        subtitle: "Flip the mood streak",
        price: "7,800 $GM",
        accent: "from-[#ffd1ff] to-[#f88ac1]",
        badge: "add",
      },
      {
        id: "pirate",
        title: "Pirate Captain NFT",
        subtitle: "Treasure hunt bonus",
        price: "7,800 $GM",
        accent: "from-[#ffe59a] to-[#f6b042]",
        badge: "add",
      },
    ],
    acquired: [
      {
        id: "acquired-150",
        title: "150 Days Streak",
        subtitle: "Legendary perseverance",
        price: "1,500 $GM",
        accent: "from-[#ffe59a] to-[#f6b042]",
        badge: "owned",
      },
      {
        id: "acquired-first",
        title: "First 150 Buyers",
        subtitle: "Early adopter flex",
        price: "1,500 $GM",
        accent: "from-[#8cd8ff] to-[#33a2ff]",
        badge: "owned",
      },
      {
        id: "acquired-30",
        title: "30 Days Streak",
        subtitle: "Rare streak saver",
        price: "1,500 $GM",
        accent: "from-[#ffd1ff] to-[#f88ac1]",
        badge: "owned",
      },
    ],
  };

export const achievements: Achievement[] = [
  {
    id: "showcase",
    title: "GM Showcase Active",
    subtitle: "Featured community contributor",
    description: "Participate in 4 GM showcases in 30 days",
    tier: "COMMON",
    progress: 42,
    progressLabel: "Progress 42%",
    perks: ["x2 token minting", "Priority listing in showcase"],
    ctaLabel: "Claim",
    ctaDisabled: true,
  },
  {
    id: "streak-30",
    title: "30 Days Streak",
    subtitle: "Achieve a 30-day activity streak",
    description: "Complete 30 daily GMs in a row",
    tier: "RARE",
    progress: 75,
    progressLabel: "Progress 75%",
    perks: ["Unlock: Skip 1 day without breaking streak"],
    ctaLabel: "Claim",
  },
  {
    id: "streak-150",
    title: "150 Days Streak",
    subtitle: "Legendary perseverance",
    description: "Keep a 150-day streak",
    tier: "LEGENDARY",
    progress: 17,
    progressLabel: "Progress 17%",
    perks: ["x3 minting boost (30 days)"],
    ctaLabel: "Claim",
  },
  {
    id: "first-150-buyers",
    title: "First 150 Buyers",
    subtitle: "Early adopter, limited NFT",
    description: "Buy 5,000 $GM & HODL 1 week",
    tier: "EPIC",
    progress: 61,
    progressLabel: "Remaining spots: 47",
    perks: ["Limited NFT", "x2 $GM minting boost (1 week)"],
    ctaLabel: "Claim",
    secondaryCtaLabel: "Buy $GM",
  },
];

