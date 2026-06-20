import Link from "next/link";
import { ShieldCheck } from "lucide-react";
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
      <div className="flex gap-2 overflow-x-auto px-4 pb-3">
        {navigationItems.slice(0, 8).map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="shrink-0 rounded-md bg-white/10 px-3 py-2 text-xs text-neutral-100"
          >
            {item.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
