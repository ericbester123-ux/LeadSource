import Link from "next/link";
import { Menu, ShieldCheck } from "lucide-react";
import { navigationItems } from "@/lib/navigation";

export function MobileNav() {
  return (
    <div className="border-b border-black/10 bg-ink text-white lg:hidden">
      <div className="flex h-16 items-center gap-3 px-4">
        <ShieldCheck className="h-5 w-5 text-gold-300" />
        <div>
          <div className="font-semibold">LeadSource</div>
          <div className="text-xs text-gold-200">Estates Elevate</div>
        </div>
      </div>
      <details className="px-4 pb-3">
        <summary className="flex min-h-10 cursor-pointer list-none items-center justify-between rounded-md bg-white/10 px-3 py-2 text-sm font-semibold">
          Menu
          <Menu className="h-4 w-4" />
        </summary>
        <nav className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {navigationItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="min-h-10 rounded-md bg-white/10 px-3 py-2 text-xs text-neutral-100"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </details>
    </div>
  );
}
