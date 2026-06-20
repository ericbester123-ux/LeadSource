import type { Metadata } from "next";
import "./globals.css";
import { Sidebar } from "@/components/sidebar";
import { MobileNav } from "@/components/mobile-nav";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = {
  title: "LeadSource",
  description: "Controlled B2B lead sourcing and cold email review system for Estates Elevate."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const simulate = process.env.SIMULATE_EMAIL_SENDING !== "false";

  return (
    <html lang="en">
      <body>
        <Sidebar />
        <div className="min-h-screen lg:pl-72">
          <MobileNav />
          <header className="sticky top-0 z-10 border-b border-black/10 bg-[#f7f5ef]/90 backdrop-blur">
            <div className="flex min-h-16 items-center justify-between gap-4 px-4 md:px-8">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gold-700">
                  Estates Elevate
                </p>
                <h1 className="text-xl font-semibold text-ink">LeadSource</h1>
              </div>
              <div className="flex items-center gap-2">
                <Badge tone={simulate ? "gold" : "red"}>{simulate ? "SIMULATED" : "LIVE"}</Badge>
                <Badge tone="black">Review Required</Badge>
              </div>
            </div>
          </header>
          <main className="px-4 py-6 md:px-8">{children}</main>
        </div>
      </body>
    </html>
  );
}
