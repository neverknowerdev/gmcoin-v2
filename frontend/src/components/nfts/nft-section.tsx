import Image from "next/image";
import clsx from "clsx";
import type { NftItem } from "./data";

interface NftSectionProps {
  title: string;
  items: NftItem[];
}

export function NftSection({ title, items }: NftSectionProps) {
  return (
    <section>
      <h2 className="text-lg font-semibold text-white">{title}</h2>
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {items.map((item) => (
          <article
            key={item.id}
            className="arc relative flex h-[230px] flex-col items-center overflow-hidden px-4 pt-5 pb-3 text-center text-slate-900 shadow-2xl shadow-sky-900/25"
          >
            <div
              className={clsx(
                "relative mb-3 flex h-[120px] w-full items-center justify-center rounded-[40px] rounded-b-[26px] bg-gradient-to-br shadow-inner shadow-white/50",
                item.accent
              )}
            >
              <Image
                src="/images/gmMascot.svg"
                alt={`${item.title} mascot`}
                width={70}
                height={70}
              />
              {item.badge === "add" && (
                <span className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-white/80 text-lg font-semibold text-slate-900 shadow">
                  +
                </span>
              )}
              {item.badge === "owned" && (
                <span className="absolute right-4 top-4 rounded-full bg-emerald-100 px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-emerald-800">
                  Owned
                </span>
              )}
            </div>
            <h3 className="text-sm font-semibold leading-tight">{item.title}</h3>
            {item.subtitle && (
              <p className="text-[11px] text-slate-500">{item.subtitle}</p>
            )}
            <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-slate-600">
              Price <span className="text-slate-900">{item.price}</span>
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}