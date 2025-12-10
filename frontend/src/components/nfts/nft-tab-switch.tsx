import clsx from "clsx";

type TabKey = "nfts" | "achievements";

interface NftTabSwitchProps {
  active: TabKey;
  onChange: (tab: TabKey) => void;
}

export function NftTabSwitch({ active, onChange }: NftTabSwitchProps) {
  return (
    <div className="mb-6">
      <div className="rounded-full glass p-1 text-sm font-semibold text-white">
        <div className="grid grid-cols-2 gap-1">
          {(["nfts", "achievements"] as const).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => onChange(key)}
              className={clsx(
                "rounded-full px-4 py-2 transition",
                active === key
                  ? "bg-white/50 text-black shadow-xl"
                  : "text-white/60"
              )}
            >
              {key === "nfts" ? "NFTs" : "Achievements"}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

