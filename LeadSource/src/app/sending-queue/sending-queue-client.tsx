"use client";

import { useMemo, useState } from "react";
import { Campaign, SendingInbox } from "@prisma/client";
import { Check, Download, Eye, Play, RefreshCw, SkipForward, StopCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { Input, Select, Textarea } from "@/components/ui/input";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { Table, TableWrap } from "@/components/ui/table";
import { csvEscape, formatDate } from "@/lib/lead-utils";
import { queueStatuses, SendingQueueItemWithInclude } from "@/lib/sending-queue";
import {
  approveQueueItems,
  generateQueueFromApprovedEnrollments,
  processDueQueueSimulation,
  rescheduleQueueItem,
  skipQueueItems,
  stopQueueItems
} from "./actions";

function dateInput(value?: Date | string | null) {
  if (!value) return "";
  const date = new Date(value);
  const pad = (input: number) => String(input).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function unique(values: Array<string | null | undefined>) {
  return Array.from(new Set(values.filter((value): value is string => Boolean(value)))).sort();
}

function warningFor(item: SendingQueueItemWithInclude) {
  const warnings = [];
  const verification = item.lead.emailVerification?.status ?? "Not Checked";
  const compliance = item.lead.complianceCheck?.status ?? "Pending Review";
  if (["Invalid", "Risky", "Unknown", "Catch-All", "Not Checked"].includes(verification)) warnings.push(`Verification: ${verification}`);
  if (compliance !== "Passed") warnings.push(`Compliance: ${compliance}`);
  if (item.campaign.pausedBy === "Domain Guard") warnings.push(item.campaign.pauseReason ?? "Campaign paused by Domain Guard");
  if (item.skippedReason || item.skipReason) warnings.push(item.skippedReason || item.skipReason);
  return warnings.join(" | ");
}

export function SendingQueueClient({
  queueItems,
  campaigns,
  inboxes,
  simulate,
  provider,
  liveGateBlocked,
  liveGateReasons,
  domainRiskWarnings
}: {
  queueItems: SendingQueueItemWithInclude[];
  campaigns: Campaign[];
  inboxes: SendingInbox[];
  simulate: boolean;
  provider: string;
  liveGateBlocked: boolean;
  liveGateReasons: string[];
  domainRiskWarnings: string[];
}) {
  const [selected, setSelected] = useState<string[]>([]);
  const [status, setStatus] = useState("");
  const [campaign, setCampaign] = useState("");
  const [country, setCountry] = useState("");
  const [scheduledDate, setScheduledDate] = useState("");
  const [inbox, setInbox] = useState("");
  const [preview, setPreview] = useState<SendingQueueItemWithInclude | null>(null);
  const [reschedule, setReschedule] = useState<SendingQueueItemWithInclude | null>(null);

  const filtered = useMemo(() => queueItems.filter((item) => {
    const date = item.scheduledFor ? new Date(item.scheduledFor).toISOString().slice(0, 10) : "";
    return (
      (!status || item.status === status) &&
      (!campaign || item.campaignId === campaign) &&
      (!country || item.lead.country === country) &&
      (!scheduledDate || date === scheduledDate) &&
      (!inbox || item.inboxId === inbox)
    );
  }), [campaign, country, inbox, queueItems, scheduledDate, status]);

  const today = new Date();
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const sentToday = queueItems.filter((item) => item.sentAt && new Date(item.sentAt) >= startOfToday).length;
  const dailyLimit = inboxes[0]?.dailyLimit ?? 20;
  const remaining = Math.max(0, dailyLimit - sentToday);

  function toggle(id: string) {
    setSelected((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  }

  function exportCsv() {
    const headers = ["Lead ID", "Campaign ID", "Campaign Step ID", "Email Template ID", "Recipient email", "Subject", "Status", "Scheduled send time", "Sent time", "Failure reason", "Skip reason", "Provider message ID", "Retry count", "Created date", "Updated date"];
    const rows = filtered.map((item) => [
      item.leadId,
      item.campaignId,
      item.campaignStepId,
      item.emailTemplateId,
      item.recipientEmail,
      item.subject,
      item.status,
      item.scheduledFor?.toISOString(),
      item.sentAt?.toISOString(),
      item.failureReason,
      item.skippedReason || item.skipReason,
      item.providerMessageId,
      item.retryCount,
      item.createdAt.toISOString(),
      item.updatedAt.toISOString()
    ].map(csvEscape).join(","));
    const blob = new Blob([[headers.join(","), ...rows].join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "leadsource-sending-queue.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 xl:flex-row xl:items-center">
        <div>
          <h2 className="text-2xl font-semibold">Sending Queue</h2>
          <p className="mt-1 text-sm text-neutral-600">Controlled review queue. Processing is simulation-only.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge tone={simulate ? "gold" : "red"}>{simulate ? "SIMULATED MODE" : "LIVE SENDING ENABLED"}</Badge>
          <Badge tone="black">Review Required</Badge>
          <Badge tone="black">Provider: {provider.toUpperCase()}</Badge>
          <Badge tone={dailyLimit > 50 ? "red" : "green"}>{remaining} daily sends remaining</Badge>
        </div>
      </div>

      {!simulate && (
        <Card className="border-red-200 bg-red-50 text-sm leading-6 text-red-800">
          Live sending can affect domain reputation and legal compliance. Confirm that SPF, DKIM, DMARC, unsubscribe,
          suppression list, email verification, and compliance checks are configured.
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-4">
        <Card className="p-4"><div className="text-xs text-neutral-500">Queued items</div><div className="mt-1 text-2xl font-semibold">{queueItems.length}</div></Card>
        <Card className="p-4"><div className="text-xs text-neutral-500">Approved/Scheduled</div><div className="mt-1 text-2xl font-semibold">{queueItems.filter((item) => ["Approved", "Scheduled"].includes(item.status)).length}</div></Card>
        <Card className="p-4"><div className="text-xs text-neutral-500">Sent simulated today</div><div className="mt-1 text-2xl font-semibold">{sentToday}</div></Card>
        <Card className="p-4"><div className="text-xs text-neutral-500">Blocked/skipped</div><div className="mt-1 text-2xl font-semibold">{queueItems.filter((item) => ["Blocked", "Skipped", "Stopped", "Suppressed", "Failed"].includes(item.status)).length}</div></Card>
      </div>

      {liveGateBlocked && !simulate && (
        <Card className="border-red-200 bg-red-50 text-sm leading-6 text-red-800">
          Live sending gate is blocked: {liveGateReasons.join(" ")}
        </Card>
      )}

      {dailyLimit > 50 && (
        <Card className="border-red-200 bg-red-50 text-sm text-red-800">
          Daily inbox limit is above 50. LeadSource recommends conservative sending limits.
        </Card>
      )}

      {domainRiskWarnings.length > 0 && (
        <Card className="border-red-200 bg-red-50 text-sm leading-6 text-red-800">
          <div className="font-semibold">Domain Guard campaign protection is active.</div>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            {domainRiskWarnings.map((warning) => <li key={warning}>{warning}</li>)}
          </ul>
        </Card>
      )}

      <Card>
        <div className="grid gap-3 md:grid-cols-5">
          <Select value={status} onChange={(event) => setStatus(event.target.value)}>
            <option value="">All statuses</option>
            {queueStatuses.map((item) => <option key={item}>{item}</option>)}
          </Select>
          <Select value={campaign} onChange={(event) => setCampaign(event.target.value)}>
            <option value="">All campaigns</option>
            {campaigns.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </Select>
          <Select value={country} onChange={(event) => setCountry(event.target.value)}>
            <option value="">All countries</option>
            {unique(queueItems.map((item) => item.lead.country)).map((item) => <option key={item}>{item}</option>)}
          </Select>
          <Input type="date" value={scheduledDate} onChange={(event) => setScheduledDate(event.target.value)} />
          <Select value={inbox} onChange={(event) => setInbox(event.target.value)}>
            <option value="">All inboxes</option>
            {inboxes.map((item) => <option key={item.id} value={item.id}>{item.email}</option>)}
          </Select>
        </div>
      </Card>

      <div className="flex flex-wrap gap-2">
        <form action={generateQueueFromApprovedEnrollments}><Button><RefreshCw className="h-4 w-4" /> Generate queue</Button></form>
        <form action={processDueQueueSimulation}><Button variant="secondary"><Play className="h-4 w-4" /> {simulate ? "Process today simulation" : "Process due queue"}</Button></form>
        <Button type="button" variant="secondary" onClick={exportCsv}><Download className="h-4 w-4" /> Export CSV</Button>
      </div>

      <form action={approveQueueItems}>
        {selected.map((id) => <input key={id} name="queueIds" type="hidden" value={id} />)}
        <Card className="mb-4 flex flex-wrap items-center gap-2">
          <Badge tone="black">{selected.length} selected</Badge>
          <Button variant="secondary" disabled={!selected.length}><Check className="h-4 w-4" /> Approve selected</Button>
        </Card>
      </form>
      <div className="grid gap-3 md:grid-cols-2">
        <form action={skipQueueItems} className="flex gap-2">
          {selected.map((id) => <input key={id} name="queueIds" type="hidden" value={id} />)}
          <Input name="reason" placeholder="Skip reason" />
          <Button variant="ghost" disabled={!selected.length}><SkipForward className="h-4 w-4" /> Skip</Button>
        </form>
        <form action={stopQueueItems} className="flex gap-2">
          {selected.map((id) => <input key={id} name="queueIds" type="hidden" value={id} />)}
          <Input name="reason" placeholder="Stop reason" />
          <Button variant="ghost" disabled={!selected.length}><StopCircle className="h-4 w-4" /> Stop</Button>
        </form>
      </div>

      <TableWrap>
        <div className="max-h-[68vh] overflow-auto">
          <Table className="min-w-[2300px]">
            <thead className="sticky top-0 bg-neutral-50 text-xs uppercase text-neutral-500">
              <tr>
                <th className="px-3 py-3"></th>
                <th className="px-3 py-3">Status</th>
                <th className="px-3 py-3">Lead</th>
                <th className="px-3 py-3">Campaign</th>
                <th className="px-3 py-3">Step</th>
                <th className="px-3 py-3">Inbox</th>
                <th className="px-3 py-3">Recipient</th>
                <th className="px-3 py-3">Subject</th>
                <th className="px-3 py-3">Scheduled</th>
                <th className="px-3 py-3">Sent</th>
                <th className="px-3 py-3">Warnings / reasons</th>
                <th className="px-3 py-3">Retry</th>
                <th className="px-3 py-3">Provider message</th>
                <th className="px-3 py-3">Created</th>
                <th className="px-3 py-3">Updated</th>
                <th className="px-3 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/10">
              {filtered.map((item) => (
                <tr key={item.id} className="align-top">
                  <td className="px-3 py-3"><input type="checkbox" checked={selected.includes(item.id)} onChange={() => toggle(item.id)} className="h-4 w-4 accent-gold-500" /></td>
                  <td className="px-3 py-3"><StatusBadge status={item.status} /></td>
                  <td className="px-3 py-3">{item.lead.companyName}<div className="text-xs text-neutral-500">{item.lead.country}</div></td>
                  <td className="px-3 py-3">{item.campaign.name}</td>
                  <td className="px-3 py-3">{item.stepNumber}</td>
                  <td className="px-3 py-3">{item.inbox?.email ?? "No inbox"}</td>
                  <td className="px-3 py-3">{item.recipientEmail}</td>
                  <td className="max-w-[280px] px-3 py-3">{item.subject}</td>
                  <td className="px-3 py-3">{formatDate(item.scheduledFor)}</td>
                  <td className="px-3 py-3">{formatDate(item.sentAt)}</td>
                  <td className="max-w-[360px] px-3 py-3 text-sm text-red-700">{warningFor(item)}</td>
                  <td className="px-3 py-3">{item.retryCount}</td>
                  <td className="px-3 py-3">{item.providerMessageId}</td>
                  <td className="px-3 py-3">{formatDate(item.createdAt)}</td>
                  <td className="px-3 py-3">{formatDate(item.updatedAt)}</td>
                  <td className="px-3 py-3">
                    <div className="flex gap-2">
                      <Button type="button" variant="ghost" className="h-9 px-3" onClick={() => setPreview(item)}><Eye className="h-4 w-4" /> Preview</Button>
                      <Button type="button" variant="ghost" className="h-9 px-3" onClick={() => setReschedule(item)}>Reschedule</Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        </div>
      </TableWrap>

      {preview && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4">
          <div className="w-full max-w-3xl rounded-lg bg-white p-5 shadow-glow">
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <h3 className="text-lg font-semibold">Rendered email preview</h3>
                <p className="text-sm text-neutral-600">{preview.recipientEmail}</p>
              </div>
              <Button type="button" variant="ghost" onClick={() => setPreview(null)}>Close</Button>
            </div>
            <div className="rounded-md border border-black/10 bg-neutral-50 p-4">
              <div className="text-sm font-semibold">{preview.subject}</div>
              <pre className="mt-4 whitespace-pre-wrap text-sm leading-6 text-neutral-700">{preview.body}</pre>
            </div>
          </div>
        </div>
      )}

      {reschedule && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4">
          <form action={rescheduleQueueItem} className="w-full max-w-md rounded-lg bg-white p-5 shadow-glow">
            <input type="hidden" name="queueId" value={reschedule.id} />
            <h3 className="text-lg font-semibold">Reschedule queue item</h3>
            <label className="mt-4 grid gap-1 text-sm font-medium">
              Scheduled send time
              <Input name="scheduledFor" type="datetime-local" defaultValue={dateInput(reschedule.scheduledFor)} />
            </label>
            <div className="mt-5 flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => setReschedule(null)}>Cancel</Button>
              <Button>Save schedule</Button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
