"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import { ShieldCheck } from "lucide-react";
import { navigationItems } from "@/lib/navigation";

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed inset-y-0 left-0 hidden w-72 flex-col border-r border-white/10 bg-ink text-white lg:flex">
      <div className="flex h-20 items-center gap-3 border-b border-white/10 px-6">
        <div className="flex h-10 w-10 items-center justify-center rounded-md bg-gold-300 text-ink">
          <ShieldCheck className="h-5 w-5" />
        </div>
        <div>
          <div className="text-base font-semibold">LeadSource</div>
          <div className="text-xs text-gold-200">by Estates Elevate</div>
        </div>
      </div>
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        {navigationItems.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={clsx(
                "mb-1 flex min-h-10 items-center gap-3 rounded-md px-3 py-2 text-sm transition",
                active ? "bg-gold-300 text-ink" : "text-neutral-300 hover:bg-white/10 hover:text-white"
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className="truncate">{item.label}</span>
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-white/10 p-4 text-xs text-neutral-400">
        Simulation mode is on by default. Review is required before sending.
      </div>
    </aside>
  );
}
