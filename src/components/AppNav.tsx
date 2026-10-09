"use client";

import { Building2, LogOut, Scale, Settings2 } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { logout } from "@/lib/store";

const LINKS = [
  { href: "/", label: "العقارات", icon: Building2 },
  { href: "/comparables", label: "المقارنات", icon: Scale },
  { href: "/settings", label: "الإعدادات", icon: Settings2 },
];

export default function AppNav({ light }: { light?: boolean }) {
  const path = usePathname();
  return (
    <nav className="flex items-center gap-1">
      {LINKS.map((l) => {
        const active = l.href === "/" ? path === "/" : path.startsWith(l.href);
        return (
          <Link
            key={l.href}
            href={l.href}
            className={`flex h-10 items-center gap-1.5 rounded-xl px-3 text-sm font-medium transition ${
              light ? (active ? "bg-white/15 text-white" : "text-white/75 hover:bg-white/10") : active ? "bg-navy text-white" : "text-muted hover:bg-navy/5 hover:text-navy"
            }`}
          >
            <l.icon className="h-4 w-4" />
            <span className="hidden md:inline">{l.label}</span>
          </Link>
        );
      })}
      <button onClick={logout} className={`grid h-10 w-10 place-items-center rounded-xl ${light ? "text-white/70 hover:bg-white/10" : "text-muted hover:bg-navy/5"}`} aria-label="تسجيل الخروج" title="تسجيل الخروج">
        <LogOut className="h-4 w-4" />
      </button>
    </nav>
  );
}
