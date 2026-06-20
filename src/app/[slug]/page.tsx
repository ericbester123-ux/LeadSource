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

export default async function FallbackPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const title = titles[slug] ?? "LeadSource";

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">{title}</h2>
        <p className="mt-1 text-sm text-neutral-600">This route is registered, but no dedicated workflow view is available for it.</p>
      </div>
      <div className="rounded-lg border border-black/10 bg-white p-5 text-sm text-neutral-700">
        Use the main navigation to open an active LeadSource workflow.
      </div>
    </div>
  );
}
