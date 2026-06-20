import { AlertTriangle, CheckCircle2, Save, ShieldCheck } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader } from "@/components/ui/card";
import { FormSection } from "@/components/ui/form-section";
import { Input } from "@/components/ui/input";
import { formatDate } from "@/lib/lead-utils";
import { getChecklistSummary } from "@/lib/domain-guard/domainChecklistService";
import { getDomainRiskSummary, getOrCreateDomainGuard } from "@/lib/domain-guard/domainReputationGuard";
import { sendingWindowLabel } from "@/lib/domain-guard/sendingLimitService";
import { evaluateLiveSendingGate } from "@/lib/domain-guard/liveSendingGate";
import { LiveSendingGateClient } from "./live-sending-gate-client";
import { updateDomainChecklistAction } from "./actions";

export const dynamic = "force-dynamic";

const auditActions = [
  "Domain checklist updated",
  "Sending domain updated",
  "Sending limit changed",
  "Sending days changed",
  "Sending window changed",
  "Warm-up mode changed",
  "Simulation mode changed",
  "Bounce threshold changed",
  "Unsubscribe threshold changed",
  "Complaint threshold changed",
  "Campaign paused due to bounce threshold",
  "Campaign paused due to unsubscribe threshold",
  "Live sending blocked",
  "Live sending enabled",
  "Live sending disabled",
  "Queue item blocked by live sending gate"
];

export default async function DomainGuardPage() {
  const guard = await getOrCreateDomainGuard();
  const summary = getChecklistSummary(guard);
  const gate = evaluateLiveSendingGate(guard);
  const risk = await getDomainRiskSummary();
  const audits = await prisma.auditLog.findMany({
    where: { action: { in: auditActions } },
    orderBy: { createdAt: "desc" },
    take: 12
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 xl:flex-row xl:items-center">
        <div>
          <h2 className="text-2xl font-semibold">Domain Guard</h2>
          <p className="mt-1 text-sm text-neutral-600">Manual domain reputation checklist and safe sending controls.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge tone={guard.simulationMode ? "gold" : "red"}>{guard.simulationMode ? "SIMULATED MODE" : "LIVE SENDING ENABLED"}</Badge>
          <Badge tone={guard.warmupMode ? "green" : "gray"}>Warm-up {guard.warmupMode ? "ON" : "OFF"}</Badge>
          <Badge tone={summary.readyForLiveSending ? "green" : "red"}>{summary.readyForLiveSending ? "Live sending allowed" : "Live sending blocked"}</Badge>
          <Badge tone="black">{guard.dailyLimitPerInbox} per inbox/day</Badge>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card className="p-4"><div className="text-xs text-neutral-500">Sending mode</div><div className="mt-1 text-xl font-semibold">{guard.simulationMode ? "Simulated" : "Live"}</div></Card>
        <Card className="p-4"><div className="text-xs text-neutral-500">Warm-up mode</div><div className="mt-1 text-xl font-semibold">{guard.warmupMode ? "On" : "Off"}</div></Card>
        <Card className="p-4"><div className="text-xs text-neutral-500">Sending window</div><div className="mt-1 text-xl font-semibold">{sendingWindowLabel(guard)}</div></Card>
        <Card className="p-4"><div className="text-xs text-neutral-500">Checklist complete</div><div className="mt-1 text-xl font-semibold">{summary.completion}%</div></Card>
      </div>

      <LiveSendingGateClient
        allowed={gate.allowed}
        reasons={gate.reasons}
        liveSendingAllowed={guard.liveSendingAllowed}
        lastGateBlockReason={guard.lastGateBlockReason}
      />

      <form action={updateDomainChecklistAction}>
        <Card>
          <CardHeader>
            <div>
              <h3 className="text-lg font-semibold">Domain Guard Settings</h3>
              <p className="text-sm text-neutral-600">Checklist is manual for now. Automated DNS checks can plug into this structure later.</p>
            </div>
            <Button><Save className="h-4 w-4" /> Save Domain Guard</Button>
          </CardHeader>

          <FormSection title="Sending Domain" description="Use a dedicated outreach domain before live sending.">
            <label className="grid gap-2 text-sm font-medium">
              Sending domain
              <Input name="sendingDomain" defaultValue={guard.sendingDomain} />
            </label>
          </FormSection>

          <FormSection title="Domain Checklist" description="Manual checks required before considering live sending.">
            <div className="grid gap-3 md:grid-cols-2">
              {summary.items.map((item) => (
                <label key={String(item.key)} className="flex items-center gap-3 rounded-md border border-black/10 p-3 text-sm">
                  <input name={String(item.key)} type="checkbox" defaultChecked={item.complete} className="h-4 w-4 accent-gold-500" />
                  {item.label}
                </label>
              ))}
            </div>
          </FormSection>

          <FormSection title="Sending Limits" description="Conservative defaults keep warm-up controlled.">
            <div className="grid gap-4 md:grid-cols-2">
              <label className="grid gap-2 text-sm font-medium">
                Daily sending limit per inbox
                <Input name="dailyLimitPerInbox" type="number" min={1} defaultValue={guard.dailyLimitPerInbox} />
              </label>
              <label className="grid gap-2 text-sm font-medium">
                Sending days
                <Input name="sendingDays" defaultValue={guard.sendingDays} />
              </label>
              <label className="grid gap-2 text-sm font-medium">
                Sending window start
                <Input name="sendingWindowStart" type="time" defaultValue={guard.sendingWindowStart} />
              </label>
              <label className="grid gap-2 text-sm font-medium">
                Sending window end
                <Input name="sendingWindowEnd" type="time" defaultValue={guard.sendingWindowEnd} />
              </label>
              <label className="flex items-center gap-3 rounded-md border border-black/10 p-3 text-sm">
                <input name="warmupMode" type="checkbox" defaultChecked={guard.warmupMode} className="h-4 w-4 accent-gold-500" />
                Warm-up mode
              </label>
              <label className="flex items-center gap-3 rounded-md border border-black/10 p-3 text-sm">
                <input name="simulationMode" type="checkbox" defaultChecked={guard.simulationMode} className="h-4 w-4 accent-gold-500" />
                Simulation mode
              </label>
            </div>
          </FormSection>

          <FormSection title="Risk Thresholds" description="Pause campaigns automatically when risk rates exceed safe limits.">
            <div className="grid gap-4 md:grid-cols-3">
              <label className="grid gap-2 text-sm font-medium">
                Bounce threshold %
                <Input name="bounceThreshold" type="number" min={0} step="0.1" defaultValue={(guard.bounceThreshold * 100).toFixed(1)} />
              </label>
              <label className="grid gap-2 text-sm font-medium">
                Unsubscribe threshold %
                <Input name="unsubscribeThreshold" type="number" min={0} step="0.1" defaultValue={(guard.unsubscribeThreshold * 100).toFixed(1)} />
              </label>
              <label className="grid gap-2 text-sm font-medium">
                Complaint threshold % placeholder
                <Input name="complaintThreshold" type="number" min={0} step="0.1" defaultValue={(guard.complaintThreshold * 100).toFixed(1)} />
              </label>
            </div>
          </FormSection>
        </Card>
      </form>

      <Card>
        <CardHeader>
          <div>
            <h3 className="text-lg font-semibold">Campaign Safety Warnings</h3>
            <p className="text-sm text-neutral-600">Domain Guard pauses affected campaigns when bounce or unsubscribe rates exceed thresholds.</p>
          </div>
          <Badge tone={risk.warnings.length ? "red" : "green"}>{risk.warnings.length} warnings</Badge>
        </CardHeader>
        <div className="grid gap-4 xl:grid-cols-3">
          <div className="rounded-md border border-black/10 bg-neutral-50 p-4">
            <div className="text-xs text-neutral-500">Bounce rate</div>
            <div className="mt-1 text-2xl font-semibold">{(risk.aggregateBounceRate * 100).toFixed(1)}%</div>
            <div className="mt-1 text-xs text-neutral-500">Threshold {(guard.bounceThreshold * 100).toFixed(1)}%</div>
          </div>
          <div className="rounded-md border border-black/10 bg-neutral-50 p-4">
            <div className="text-xs text-neutral-500">Unsubscribe rate</div>
            <div className="mt-1 text-2xl font-semibold">{(risk.aggregateUnsubscribeRate * 100).toFixed(1)}%</div>
            <div className="mt-1 text-xs text-neutral-500">Threshold {(guard.unsubscribeThreshold * 100).toFixed(1)}%</div>
          </div>
          <div className="rounded-md border border-black/10 bg-neutral-50 p-4">
            <div className="text-xs text-neutral-500">Paused by Domain Guard</div>
            <div className="mt-1 text-2xl font-semibold">{risk.pausedByDomainGuardCount}</div>
            <div className="mt-1 text-xs text-neutral-500">Complaint threshold placeholder {(guard.complaintThreshold * 100).toFixed(1)}%</div>
          </div>
        </div>
        <div className="mt-4 rounded-md border border-black/10 bg-neutral-50 p-4">
          <div className="mb-2 text-sm font-semibold">Active warnings</div>
          <ul className="space-y-1 text-sm text-red-700">
            {risk.warnings.map((warning) => <li key={warning}>{warning}</li>)}
            {guard.dailyLimitPerInbox > 50 && <li>Daily sending limit is above 50 emails per inbox per day.</li>}
            {!gate.allowed && <li>Live sending gate is blocked.</li>}
            {!risk.warnings.length && guard.dailyLimitPerInbox <= 50 && gate.allowed && <li className="text-neutral-600">No active campaign safety warnings.</li>}
          </ul>
        </div>
      </Card>

      <Card>
        <CardHeader>
          <div>
            <h3 className="text-lg font-semibold">Checklist Completion</h3>
            <p className="text-sm text-neutral-600">Live sending stays blocked unless every item is complete and simulation is intentionally disabled.</p>
          </div>
          <ShieldCheck className="h-5 w-5 text-gold-600" />
        </CardHeader>
        <div className="grid gap-4 xl:grid-cols-3">
          <div className="rounded-md border border-black/10 bg-neutral-50 p-4">
            <div className="text-xs text-neutral-500">Completion</div>
            <div className="mt-2 text-3xl font-semibold">{summary.completion}%</div>
            <div className="mt-3 h-2 rounded-full bg-neutral-200">
              <div className="h-2 rounded-full bg-gold-500" style={{ width: `${summary.completion}%` }} />
            </div>
          </div>
          <div className="rounded-md border border-black/10 bg-neutral-50 p-4">
            <div className="mb-2 flex items-center gap-2 text-sm font-semibold"><AlertTriangle className="h-4 w-4 text-red-600" /> Missing items</div>
            <ul className="space-y-1 text-sm text-neutral-700">
              {summary.missingItems.map((item) => <li key={item}>{item}</li>)}
              {!summary.missingItems.length && <li>None</li>}
            </ul>
          </div>
          <div className="rounded-md border border-black/10 bg-neutral-50 p-4">
            <div className="mb-2 flex items-center gap-2 text-sm font-semibold"><CheckCircle2 className="h-4 w-4 text-gold-600" /> Warnings</div>
            <ul className="space-y-1 text-sm text-neutral-700">
              {summary.warnings.map((item) => <li key={item}>{item}</li>)}
              {!summary.warnings.length && <li>No active warnings</li>}
            </ul>
          </div>
        </div>
      </Card>

      <Card>
        <CardHeader>
          <div>
            <h3 className="text-lg font-semibold">Recent Safety Audit Events</h3>
            <p className="text-sm text-neutral-600">Domain Guard and sending safety changes.</p>
          </div>
        </CardHeader>
        <div className="divide-y divide-black/10">
          {audits.map((audit) => (
            <div key={audit.id} className="grid gap-2 py-3 text-sm md:grid-cols-[220px_1fr_140px]">
              <div className="font-medium">{audit.action}</div>
              <div className="text-neutral-600">{audit.reason}</div>
              <div className="text-neutral-500">{formatDate(audit.createdAt)}</div>
            </div>
          ))}
          {!audits.length && <div className="py-6 text-sm text-neutral-600">No Domain Guard audit events yet.</div>}
        </div>
      </Card>
    </div>
  );
}
