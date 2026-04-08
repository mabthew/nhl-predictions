"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/models", label: "Models" },
  { href: "/admin/builder", label: "Builder" },
  { href: "/admin/engagement", label: "Engagement" },
  { href: "/admin/costs", label: "Costs" },
];

export default function AdminNav() {
  const pathname = usePathname();

  function isActive(href: string) {
    if (href === "/admin") return pathname === "/admin";
    return pathname.startsWith(href);
  }

  return (
    <nav className="flex gap-1 bg-white/10 rounded-xl p-1.5">
      {TABS.map((tab) => (
        <Link
          key={tab.href}
          href={tab.href}
          className={`px-5 py-2 rounded-lg text-sm font-semibold tracking-wide transition-all ${
            isActive(tab.href)
              ? "bg-white text-charcoal shadow-sm"
              : "text-white/50 hover:text-white hover:bg-white/10"
          }`}
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}
