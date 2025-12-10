"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";

const navItems = [
  { label: "Home", slug: "/", icon: "/images/home.svg" },
  { label: "Earn", slug: "/earn", icon: "/images/earn.svg" },
  { label: "NFTs", slug: "/nfts", icon: "/images/nft.svg" },
  { label: "Profile", slug: "/profile", icon: "/images/profile.svg" },
];

export function NavBar() {
  const pathname = usePathname();

  return (
    <nav className="glass pointer-events-auto fixed inset-x-4 bottom-5 z-40 flex items-center justify-between rounded-3xl px-6 py-4 text-xs uppercase tracking-wide text-muted-foreground">
      {navItems.map(({ label, slug, icon }) => {
        const isActive = pathname === slug || (slug === "/" && pathname === "/");
        return (
          <Link
            key={slug}
            href={slug}
            className={clsx(
              "flex flex-col items-center gap-1 rounded-2xl px-3 py-1 transition",
              isActive && "text-black"
            )}
          >
            <Image
              src={icon}
              alt={`${label} icon`}
              width={22}
              height={22}
              className={clsx(isActive ? "opacity-100" : "opacity-70")}
            />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

