"use client";

import { useMemo, useState, useTransition } from "react";
import { Campaign, GHLSyncLog, Lead, Prisma } from "@prisma/client";
import { Copy, DatabaseZap, Download, Eye, KeyRound, RefreshCw, RotateCcw, SkipForward, UploadCloud } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { Card, CardHeader } from "@/components/ui/card";
import { Input, Select } from "@/components/ui/input";
import { Table, TableWrap } from "@/components/ui/table";
import { csvEscape, formatDate } from "@/lib/lead-utils";
import { GhlConfigStatus } from "@/lib/ghl/ghlConfigValidator";
import { ghlLeadInclude } from "@/lib/ghl/ghlContactMapper";
import {
  checkGhlConfigAction,
  bulkSyncLeadsToGhlAction,
  exportGhlReadyCsvAction,
  markGhlSyncSkippedAction,
  prepareLeadForGhlAction,
  previewGhlPayloadAction,
  recordGhlCredentialsReviewedAction,
  retryFailedGhlSyncAction,
  syncLeadToGhlAction
} from "./actions";

type GhlLead = Prisma.LeadGetPayload<{ include: typeof ghlLeadInclude }>;
type GhlLog = GHLSyncLog & { lead: Lead };

function unique(values: Array<string | null | undefined>) {
  return Array.from(new Set(values.filter((value): value is string => Boolean(value)))).sort();
}

function campaignName(lead: GhlLead) {
  return lead.campaignEnrollments[0]?.campaign.name ?? "No campaign";
}

function leadScore(lead: GhlLead) {
  return lead.leadScore?.score ?? "";
}

function leadQuality(lead: GhlLead) {
  return lead.leadScore?.qualityLabel ?? "";
}

function compactJson(value: unknown) {
  if (!value) return "{}";
  if (typeof value === "string") {
    try {
      return JSON.stringify(JSON.parse(value), null, 2);
    } catch {
      return value;
    }
  }
  return JSON.stringify(value, null, 2);
}

export function GhlSyncClient({
  config,
  readyLeads,
  syncedLeads,
  failedLogs,
  previewLogs,
  campaigns
}: {
  config: GhlConfigStatus;
  readyLeads: GhlLead[];
  syncedLeads: GhlLead[];
  failedLogs: GhlLog[];
  previewLogs: GhlLog[];
  campaigns: Campaign[];
}) {
  const [status, setStatus] = useState("");
  const [country, setCountry] = useState("");
  const [campaign, setCampaign] = useState("");
  const [ghlStatus, setGhlStatus] = useState("");
  const [preview, setPreview] = useState<unknown>(null);
  const [previewTitle, setPreviewTitle] = useState("GHL JSON preview");
  const [selected, setSelected] = useState<string[]>([]);
  const [isPending, startTransition] = useTransition();

  const filteredReady = useMemo(() => readyLeads.filter((lead) => (
    (!status || lead.status === status) &&
    (!country || lead.country === country) &&
    (!campaign || lead.campaignEnrollments.some((item) => item.campaignId === campaign)) &&
    (!ghlStatus || lead.ghlSyncStatus === ghlStatus)
  )), [campaign, country, ghlStatus, readyLeads, status]);

  function previewLead(lead: GhlLead) {
    const formData = new FormData();
    formData.set("leadId", lead.id);
    setPreviewTitle(`${lead.companyName} GHL payload`);
    startTransition(async () => {
      const payload = await previewGhlPayloadAction(formData);
      setPreview(payload);
    });
  }

  function previewLog(log: GhlLog) {
    setPreviewTitle(`${log.lead.companyName} saved payload`);
    setPreview(log.payload ? JSON.parse(log.payload) : { error: log.error });
  }

  function exportCsv() {
    const headers = [
      "Lead name",
      "Company name",
      "Email",
      "Phone",
      "Country",
      "City",
      "Lead status",
      "Lead score",
      "Lead quality",
      "Campaign",
      "GHL sync status",
      "Last synced date",
      "Sync error"
    ];
    const rows = filteredReady.map((lead) => [
      lead.fullName ?? [lead.firstName, lead.lastName].filter(Boolean).join(" "),
      lead.companyName,
      lead.email,
      lead.phone,
      lead.country,
      lead.city,
      lead.status,
      leadScore(lead),
      leadQuality(lead),
      campaignName(lead),
      lead.ghlSyncStatus,
      lead.ghlLastSyncedAt?.toISOString(),
      lead.ghlSyncError
    ].map(csvEscape).join(","));

    const formData = new FormData();
    formData.set("count", String(filteredReady.length));
    startTransition(() => {
      void exportGhlReadyCsvAction(formData);
    });

    const blob = new Blob([[headers.join(","), ...rows].join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "leadsource-ghl-ready.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 xl:flex-row xl:items-center">
        <div>
          <h2 className="text-2xl font-semibold">GoHighLevel Sync</h2>
          <p className="mt-1 text-sm text-neutral-600">Preview-only GHL preparation workflow. Live sync is not enabled.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge tone={config.configured ? "green" : "gold"}>{config.configured ? "Live Sync Enabled" : "Preview Mode"}</Badge>
          <Badge tone="black">{config.configured ? "Live Sync Mode" : "JSON preview only"}</Badge>
          <Badge tone="gold">SIMULATE_EMAIL_SENDING=true</Badge>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div>
            <h3 className="text-lg font-semibold">GHL Connection Status</h3>
            <p className="text-sm text-neutral-600">Credentials are checked from environment variables and not displayed in full.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <form action={checkGhlConfigAction}>
              <Button variant="secondary"><RefreshCw className="h-4 w-4" /> Check config</Button>
            </form>
            <form action={recordGhlCredentialsReviewedAction}>
              <Button variant="ghost"><KeyRound className="h-4 w-4" /> Record credential review</Button>
            </form>
          </div>
        </CardHeader>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {[
            ["API key", config.values.apiKeyConfigured ? "Configured" : "Missing"],
            ["Location ID", config.values.locationId ? "Configured" : "Missing"],
            ["Pipeline ID", config.values.pipelineId ? "Configured" : "Missing"],
            ["Stage IDs", config.values.stageNewLead && config.values.stageInterested && config.values.stageBooked && config.values.stageNotInterested ? "Configured" : "Missing"],
            ["New Lead Stage", config.values.stageNewLead || "Missing"],
            ["Interested Stage", config.values.stageInterested || "Missing"],
            ["Booked Stage", config.values.stageBooked || "Missing"],
            ["Not Interested Stage", config.values.stageNotInterested || "Missing"]
          ].map(([label, value]) => (
            <div key={label} className="rounded-md border border-black/10 bg-neutral-50 p-3 text-sm">
              <div className="text-xs uppercase text-neutral-500">{label}</div>
              <div className="mt-1 break-words font-medium">{value}</div>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <CardHeader>
          <div>
            <h3 className="text-lg font-semibold">Ready for GHL</h3>
            <p className="text-sm text-neutral-600">Interested and booked leads can be prepared for GHL in preview mode.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <form action={bulkSyncLeadsToGhlAction}>
              {selected.map((id) => <input key={id} type="hidden" name="leadIds" value={id} />)}
              <Button disabled={!selected.length}><DatabaseZap className="h-4 w-4" /> Sync selected</Button>
            </form>
            <form action={bulkSyncLeadsToGhlAction}>
              {filteredReady.map((lead) => <input key={lead.id} type="hidden" name="leadIds" value={lead.id} />)}
              <Button variant="secondary" disabled={!filteredReady.length}><DatabaseZap className="h-4 w-4" /> Bulk sync</Button>
            </form>
            <Button type="button" variant="secondary" onClick={exportCsv}><Download className="h-4 w-4" /> Export CSV</Button>
          </div>
        </CardHeader>
        <div className="mb-4 grid gap-3 xl:grid-cols-4">
          <Select value={status} onChange={(event) => setStatus(event.target.value)}>
            <option value="">All lead statuses</option>
            {unique(readyLeads.map((lead) => lead.status)).map((item) => <option key={item}>{item}</option>)}
          </Select>
          <Select value={country} onChange={(event) => setCountry(event.target.value)}>
            <option value="">All countries</option>
            {unique(readyLeads.map((lead) => lead.country)).map((item) => <option key={item}>{item}</option>)}
          </Select>
          <Select value={campaign} onChange={(event) => setCampaign(event.target.value)}>
            <option value="">All campaigns</option>
            {campaigns.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </Select>
          <Select value={ghlStatus} onChange={(event) => setGhlStatus(event.target.value)}>
            <option value="">All GHL statuses</option>
            {unique(readyLeads.map((lead) => lead.ghlSyncStatus)).map((item) => <option key={item}>{item}</option>)}
          </Select>
        </div>
        <LeadTable leads={filteredReady} onPreview={previewLead} isPending={isPending} selected={selected} setSelected={setSelected} />
      </Card>

      <Card>
        <CardHeader>
          <div>
            <h3 className="text-lg font-semibold">Synced Leads</h3>
            <p className="text-sm text-neutral-600">Leads marked as synced by future GHL workflows.</p>
          </div>
        </CardHeader>
        <TableWrap>
          <Table>
            <thead className="bg-neutral-50 text-xs uppercase text-neutral-500">
              <tr>
                <th className="px-3 py-3">Lead</th>
                <th className="px-3 py-3">GHL contact ID</th>
                <th className="px-3 py-3">GHL opportunity ID</th>
                <th className="px-3 py-3">Synced date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/10">
              {syncedLeads.map((lead) => (
                <tr key={lead.id}>
                  <td className="px-3 py-3">{lead.companyName}<div className="text-xs text-neutral-500">{lead.email}</div></td>
                  <td className="px-3 py-3">{lead.ghlContactId}</td>
                  <td className="px-3 py-3">{lead.ghlOpportunityId}</td>
                  <td className="px-3 py-3">{formatDate(lead.ghlLastSyncedAt)}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        </TableWrap>
      </Card>

      <Card>
        <CardHeader>
          <div>
            <h3 className="text-lg font-semibold">Failed Syncs</h3>
            <p className="text-sm text-neutral-600">Failed preparation or future sync attempts.</p>
          </div>
        </CardHeader>
        <TableWrap>
          <Table>
            <thead className="bg-neutral-50 text-xs uppercase text-neutral-500">
              <tr>
                <th className="px-3 py-3">Lead</th>
                <th className="px-3 py-3">Error message</th>
                <th className="px-3 py-3">Created</th>
                <th className="px-3 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/10">
              {failedLogs.map((log) => (
                <tr key={log.id}>
                  <td className="px-3 py-3">{log.lead.companyName}<div className="text-xs text-neutral-500">{log.lead.email}</div></td>
                  <td className="px-3 py-3 text-red-700">{log.error}</td>
                  <td className="px-3 py-3">{formatDate(log.createdAt)}</td>
                  <td className="px-3 py-3">
                    <div className="flex flex-wrap gap-2">
                      <Button type="button" variant="secondary" onClick={() => previewLog(log)}><Eye className="h-4 w-4" /> View payload</Button>
                      <form action={retryFailedGhlSyncAction}>
                        <input type="hidden" name="logId" value={log.id} />
                        <Button variant="ghost"><RotateCcw className="h-4 w-4" /> Retry failed sync</Button>
                      </form>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        </TableWrap>
      </Card>

      <Card>
        <CardHeader>
          <div>
            <h3 className="text-lg font-semibold">JSON Preview Logs</h3>
            <p className="text-sm text-neutral-600">Recent GHL payload previews and preparation logs.</p>
          </div>
        </CardHeader>
        <div className="space-y-3">
          {previewLogs.slice(0, 8).map((log) => (
            <button key={log.id} type="button" onClick={() => previewLog(log)} className="w-full rounded-md border border-black/10 bg-neutral-50 p-4 text-left text-sm hover:bg-gold-50">
              <div className="font-semibold">{log.lead.companyName} - {log.syncStatus}</div>
              <div className="mt-1 text-xs text-neutral-500">{formatDate(log.createdAt)}</div>
            </button>
          ))}
        </div>
      </Card>

      {preview !== null && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4">
          <div className="w-full max-w-4xl rounded-lg bg-white p-5 shadow-glow">
            <CardHeader className="px-0 pt-0">
              <h3 className="text-lg font-semibold">{previewTitle}</h3>
              <div className="flex gap-2">
                <Button type="button" variant="secondary" onClick={() => navigator.clipboard.writeText(compactJson(preview))}><Copy className="h-4 w-4" /> Copy</Button>
                <Button type="button" variant="ghost" onClick={() => setPreview(null)}>Close</Button>
              </div>
            </CardHeader>
            <pre className="max-h-[70vh] overflow-auto rounded-md bg-ink p-4 text-xs leading-5 text-white">{compactJson(preview)}</pre>
          </div>
        </div>
      )}
    </div>
  );
}

function LeadTable({
  leads,
  onPreview,
  isPending,
  selected,
  setSelected
}: {
  leads: GhlLead[];
  onPreview: (lead: GhlLead) => void;
  isPending: boolean;
  selected: string[];
  setSelected: (ids: string[]) => void;
}) {
  function toggle(id: string) {
    setSelected(selected.includes(id) ? selected.filter((item) => item !== id) : [...selected, id]);
  }

  return (
    <TableWrap>
      <div className="max-h-[62vh] overflow-auto">
        <Table className="min-w-[1700px]">
          <thead className="sticky top-0 bg-neutral-50 text-xs uppercase text-neutral-500">
            <tr>
              <th className="px-3 py-3"></th>
              <th className="px-3 py-3">Lead name</th>
              <th className="px-3 py-3">Company</th>
              <th className="px-3 py-3">Email</th>
              <th className="px-3 py-3">Phone</th>
              <th className="px-3 py-3">Country</th>
              <th className="px-3 py-3">City</th>
              <th className="px-3 py-3">Lead status</th>
              <th className="px-3 py-3">Score</th>
              <th className="px-3 py-3">Quality</th>
              <th className="px-3 py-3">Campaign</th>
              <th className="px-3 py-3">GHL status</th>
              <th className="px-3 py-3">Last synced</th>
              <th className="px-3 py-3">Sync error</th>
              <th className="px-3 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-black/10">
            {leads.map((lead) => (
              <tr key={lead.id} className="align-top">
                <td className="px-3 py-3"><input type="checkbox" checked={selected.includes(lead.id)} onChange={() => toggle(lead.id)} className="h-4 w-4 accent-gold-500" /></td>
                <td className="px-3 py-3">{lead.fullName ?? [lead.firstName, lead.lastName].filter(Boolean).join(" ")}</td>
                <td className="px-3 py-3">{lead.companyName}</td>
                <td className="px-3 py-3">{lead.email}</td>
                <td className="px-3 py-3">{lead.phone}</td>
                <td className="px-3 py-3">{lead.country}</td>
                <td className="px-3 py-3">{lead.city}</td>
                <td className="px-3 py-3"><StatusBadge status={lead.status} /></td>
                <td className="px-3 py-3">{leadScore(lead)}</td>
                <td className="px-3 py-3">{leadQuality(lead)}</td>
                <td className="px-3 py-3">{campaignName(lead)}</td>
                <td className="px-3 py-3"><StatusBadge status={lead.ghlSyncStatus} /></td>
                <td className="px-3 py-3">{formatDate(lead.ghlLastSyncedAt)}</td>
                <td className="max-w-[260px] px-3 py-3 text-red-700">{lead.ghlSyncError}</td>
                <td className="px-3 py-3">
                  <div className="flex flex-wrap gap-2">
                    <Button type="button" variant="secondary" disabled={isPending} onClick={() => onPreview(lead)}><Eye className="h-4 w-4" /> Preview JSON</Button>
                    <form action={prepareLeadForGhlAction}>
                      <input type="hidden" name="leadId" value={lead.id} />
                      <Button><UploadCloud className="h-4 w-4" /> Prepare for GHL</Button>
                    </form>
                    <form action={syncLeadToGhlAction}>
                      <input type="hidden" name="leadId" value={lead.id} />
                      <Button variant="secondary"><DatabaseZap className="h-4 w-4" /> Sync to GHL</Button>
                    </form>
                    <form action={markGhlSyncSkippedAction}>
                      <input type="hidden" name="leadId" value={lead.id} />
                      <input type="hidden" name="reason" value="Skipped manually from GHL page." />
                      <Button variant="ghost"><SkipForward className="h-4 w-4" /> Mark skipped</Button>
                    </form>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      </div>
    </TableWrap>
  );
}
