import { BarChart3, CheckCircle2, Inbox, MailCheck, ShieldCheck, Workflow } from "lucide-react";
import { Card, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { complianceMetrics, emailMetrics, ghlMetrics, leadMetrics, replyMetrics } from "@/lib/dashboard-data";
import { getDomainGuardSummary, getDomainRiskSummary } from "@/lib/domain-guard/domainReputationGuard";
import { evaluateLiveSendingGate } from "@/lib/domain-guard/liveSendingGate";

const sections = [
  { title: "Lead Sourcing", icon: BarChart3, data: leadMetrics },
  { title: "Email", icon: MailCheck, data: emailMetrics },
  { title: "Replies", icon: Inbox, data: replyMetrics },
  { title: "Compliance", icon: ShieldCheck, data: complianceMetrics },
  { title: "GoHighLevel", icon: Workflow, data: ghlMetrics }
];

export default async function DashboardPage() {
  const { guard, summary } = await getDomainGuardSummary();
  const risk = await getDomainRiskSummary();
  const gate = evaluateLiveSendingGate(guard);
  const domainMetrics = [
    ["Sending mode", guard.simulationMode ? "Simulated" : "Live"],
    ["Warm-up mode", guard.warmupMode ? "On" : "Off"],
    ["Daily limit per inbox", String(guard.dailyLimitPerInbox)],
    ["Checklist completion", `${summary.completion}%`],
    ["Bounce rate", `${(risk.aggregateBounceRate * 100).toFixed(1)}%`],
    ["Unsubscribe rate", `${(risk.aggregateUnsubscribeRate * 100).toFixed(1)}%`],
    ["Active domain warnings", String(summary.warnings.length + risk.warnings.length)],
    ["Campaigns paused by Domain Guard", String(risk.pausedByDomainGuardCount)],
    ["Live sending", gate.allowed ? "Allowed" : "Blocked"],
    ["Gate status", gate.reasons.length ? `${gate.reasons.length} block reasons` : "Passing"],
    ["Last gate block", guard.lastGateBlockReason ?? "None"]
  ];

  return (
    <div className="space-y-6">
      <section className="rounded-lg bg-ink p-6 text-white shadow-glow">
        <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
          <div>
            <Badge tone="gold">Simulation Mode On</Badge>
            <h2 className="mt-4 max-w-3xl text-3xl font-semibold">Controlled lead sourcing and outreach review hub</h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-neutral-300">
              Stage 1 and 2 focus on the dashboard shell, conservative safety defaults, database structure, and sample data.
            </p>
          </div>
          <div className="rounded-lg border border-gold-300/30 bg-white/5 p-4 text-sm text-gold-100">
            Daily safe limit: 20 emails per inbox
          </div>
        </div>
      </section>

      <div className="grid gap-5 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <div>
              <h3 className="text-lg font-semibold">Domain Guard</h3>
              <p className="text-sm text-neutral-600">Sending safety summary</p>
            </div>
            <CheckCircle2 className="h-5 w-5 text-gold-600" />
          </CardHeader>
          <dl className="grid gap-3 sm:grid-cols-2">
            {domainMetrics.map(([label, value]) => (
              <div key={label} className="rounded-md border border-black/10 bg-neutral-50 p-3">
                <dt className="text-xs text-neutral-500">{label}</dt>
                <dd className="mt-1 text-xl font-semibold text-ink">{value}</dd>
              </div>
            ))}
          </dl>
        </Card>
        {sections.map((section) => {
          const Icon = section.icon;

          return (
            <Card key={section.title}>
              <CardHeader>
                <div>
                  <h3 className="text-lg font-semibold">{section.title}</h3>
                  <p className="text-sm text-neutral-600">Stage 2 seed-ready metrics</p>
                </div>
                <Icon className="h-5 w-5 text-gold-600" />
              </CardHeader>
              <dl className="grid gap-3 sm:grid-cols-2">
                {section.data.map(([label, value]) => (
                  <div key={label} className="rounded-md border border-black/10 bg-neutral-50 p-3">
                    <dt className="text-xs text-neutral-500">{label}</dt>
                    <dd className="mt-1 text-xl font-semibold text-ink">{value}</dd>
                  </div>
                ))}
              </dl>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
