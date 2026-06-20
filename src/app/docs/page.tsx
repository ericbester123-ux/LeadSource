import { Card, CardHeader } from "@/components/ui/card";

export default function DocsPage() {
  const sections = [
    ["Workflow", "Discover leads, import CSVs, score fit, verify emails, run compliance checks, queue reviewed outreach, process replies, and sync qualified outcomes to GoHighLevel."],
    ["Compliance", "Suppression, unsubscribe, bounce, invalid email, do-not-contact, UK contact-type risk, and US live-sending requirements are enforced before sending."],
    ["Sending", "Simulation mode is the default. Live sending is gated by Domain Guard, review requirements, unsubscribe links, business address, and daily limits."],
    ["CRM Sync", "Interested and booked leads can be prepared, previewed, exported, or synced to GoHighLevel when credentials are configured."]
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">Docs</h2>
        <p className="mt-1 text-sm text-neutral-600">Operational reference for the LeadSource workflow.</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {sections.map(([title, body]) => (
          <Card key={title}>
            <CardHeader><h3 className="text-lg font-semibold">{title}</h3></CardHeader>
            <p className="text-sm leading-6 text-neutral-700">{body}</p>
          </Card>
        ))}
      </div>
    </div>
  );
}
