"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";

const navItems = [
  { label: "Home", slug: "/", icon: "/images/home.svg", iconActive: "/images/home.svg" },
  { label: "History", slug: "/history", icon: "/images/history2.svg", iconActive: "/images/history.svg" },
  { label: "Stats", slug: "/stats", icon: "/images/stats2.svg", iconActive: "/images/stats.svg" },
  { label: "Social", slug: "/social", icon: "/images/social2.svg", iconActive: "/images/social.svg" },
  { label: "Profile", slug: "/profile", icon: "/images/profile.svg", iconActive: "/images/profile.svg" },
];

export function NavBar() {
  const pathname = usePathname();

  return (
    <nav className="glass pointer-events-auto fixed inset-x-4 bottom-5 z-40 flex items-center justify-between rounded-3xl px-6 py-4 text-xs uppercase tracking-wide text-muted-foreground">
      {navItems.map(({ label, slug, icon, iconActive }) => {
        const isActive = pathname === slug || (slug === "/" && pathname === "/");
        return (
          <Link
            key={slug}
            href={slug}
            className={clsx(
              "flex items-center justify-center rounded-3xl px-5 py-3 transition",
              isActive && "text-black"
            )}
            style={isActive ? { backgroundColor: "#E8EE58" } : undefined}
          >
            <Image
              src={isActive ? iconActive : icon}
              alt={`${label} icon`}
              width={22}
              height={22}
              className={clsx(isActive ? "opacity-100" : "opacity-70")}
            />
          </Link>
        );
      })}
    </nav>
  );
}

