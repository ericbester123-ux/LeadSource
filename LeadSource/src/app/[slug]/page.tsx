import { EmptyState } from "@/components/ui/states";

const titles: Record<string, string> = {
  "lead-discovery": "Lead Discovery",
  "import-csv": "Import CSV",
  "ai-lead-scoring": "AI Lead Scoring",
  "email-verification": "Email Verification",
  campaigns: "Campaigns",
  "campaign-builder": "Campaign Builder",
  "email-builder": "Email Builder",
  "sending-queue": "Sending Queue",
  replies: "Replies",
  bookings: "Bookings",
  "ghl-sync": "GoHighLevel Sync",
  compliance: "Compliance",
  "suppression-list": "Suppression List",
  "domain-guard": "Domain Guard",
  "audit-logs": "Audit Logs",
  docs: "Docs"
};

export default async function ShellPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const title = titles[slug] ?? "LeadSource";

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">{title}</h2>
        <p className="mt-1 text-sm text-neutral-600">Shell created for Stage 1. Feature workflows arrive in later stages.</p>
      </div>
      <EmptyState title={`${title} shell`} message="This section is wired into navigation and ready for the next build stage." />
      {slug === "compliance" && (
        <div className="rounded-lg border border-gold-300 bg-gold-50 p-4 text-sm text-gold-900">
          This tool provides operational compliance checks, not legal advice. Review your outreach process with a qualified legal professional before running live campaigns.
        </div>
      )}
    </div>
  );
}
