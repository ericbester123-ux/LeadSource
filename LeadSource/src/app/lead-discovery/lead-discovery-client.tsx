"use client";

import { useActionState, useEffect, useState } from "react";
import { LeadDiscoveryRun } from "@prisma/client";
import { Check, Search, ShieldCheck, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { Table, TableWrap } from "@/components/ui/table";
import { createDiscoveryRun, saveApprovedDiscoveryLeads } from "./actions";
import { emptyDiscoveryState } from "./state";
import type { LeadDiscoveryProviderStatus } from "@/lib/lead-discovery/leadDiscoveryProviderFactory";
import { csvEscape } from "@/lib/lead-utils";

export function LeadDiscoveryClient({ runs, providerStatus }: { runs: LeadDiscoveryRun[]; providerStatus: LeadDiscoveryProviderStatus }) {
  const [state, formAction, pending] = useActionState(createDiscoveryRun, emptyDiscoveryState);
  const [localResults, setLocalResults] = useState(state.results ?? []);
  const [saveState, saveAction, savePending] = useActionState(saveApprovedDiscoveryLeads, emptyDiscoveryState);

  useEffect(() => setLocalResults(state.results ?? []), [state.results]);

  const summary = saveState.message ? saveState.summary : {
    ...emptyDiscoveryState.summary,
    ...(state.summary ?? {}),
    rejected: localResults.filter((lead) => lead.rejected).length
  };

  function updateLead(previewId: string, changes: { approved?: boolean; rejected?: boolean }) {
    setLocalResults((current) => current.map((lead) => lead.previewId === previewId ? { ...lead, ...changes } : lead));
  }

  function exportResults() {
      const headers = ["Company name", "Website", "Phone", "Location", "Country", "Source platform", "Source URL", "Contact page URL", "Google Place ID", "Google rating", "Reviews count", "Email", "Duplicate status", "Suppression status", "Confidence score", "Notes"];
    const rows = localResults.map((lead) => [
      lead.companyName,
      lead.website,
      lead.phone,
      lead.location,
      lead.country,
      lead.sourcePlatform,
      lead.sourceUrl,
      lead.contactPageUrl,
      lead.googlePlaceId,
      lead.googleRating,
      lead.googleReviewsCount,
      lead.email,
      lead.duplicate ? lead.duplicateReason ?? "Duplicate" : "No",
      lead.suppressed ? lead.suppressionReason ?? "Suppressed" : "No",
      lead.confidenceScore,
      lead.leadSourceNotes
    ].map(csvEscape).join(","));
    const blob = new Blob([[headers.join(","), ...rows].join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "leadsource-discovery-results.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">Lead Discovery</h2>
        <p className="mt-1 text-sm text-neutral-600">Create compliant discovery previews using approved providers or mock data when keys are missing.</p>
      </div>

      <Card className="flex flex-wrap items-center gap-3">
        <Badge tone="black">Current provider: {providerStatus.providerLabel}</Badge>
        <Badge tone={providerStatus.apiKeyConfigured ? "green" : "gold"}>API key {providerStatus.apiKeyConfigured ? "configured" : "missing"}</Badge>
        <Badge tone={providerStatus.mockFallbackActive ? "gold" : "green"}>{providerStatus.mockFallbackActive ? "Mock mode" : "Live provider mode"}</Badge>
        <Badge tone={providerStatus.googlePlacesConfigured ? "green" : "gray"}>Google Places {providerStatus.googlePlacesConfigured ? "configured" : "missing"}</Badge>
        <Badge tone={providerStatus.serpApiConfigured ? "green" : "gray"}>SerpAPI {providerStatus.serpApiConfigured ? "configured" : "missing"}</Badge>
      </Card>

      <Card>
        <form action={formAction} className="grid gap-4 md:grid-cols-3 xl:grid-cols-5">
          <label className="grid gap-1 text-sm font-medium">Country<Input name="country" defaultValue="United Kingdom" required /></label>
          <label className="grid gap-1 text-sm font-medium">City<Input name="city" placeholder="London" /></label>
          <label className="grid gap-1 text-sm font-medium">Region/state<Input name="regionState" placeholder="England or Florida" /></label>
          <label className="grid gap-1 text-sm font-medium">Industry<Input name="industry" defaultValue="Real Estate" /></label>
          <label className="grid gap-1 text-sm font-medium">Niche<Input name="niche" placeholder="Estate agents" /></label>
          <label className="grid gap-1 text-sm font-medium">Keyword<Input name="keyword" placeholder="estate agents" /></label>
          <label className="grid gap-1 text-sm font-medium">Keywords<Input name="keywords" placeholder="sellers landlords listings" /></label>
          <label className="grid gap-1 text-sm font-medium">Company type<Input name="companyType" placeholder="Letting agency" /></label>
          <label className="grid gap-1 text-sm font-medium">Maximum leads<Input name="maxLeads" type="number" min="1" max="50" defaultValue="10" /></label>
          <label className="grid gap-1 text-sm font-medium">Minimum lead score<Input name="minLeadScore" type="number" min="1" max="100" defaultValue="70" /></label>
          <div className="flex items-end">
            <Button className="w-full" disabled={pending}>
              <Search className="h-4 w-4" />
              Run discovery
            </Button>
          </div>
        </form>
      </Card>

      <div className="grid gap-4 md:grid-cols-5">
        {[
          ["Total found", summary.totalFound],
          ["Added", summary.added],
          ["Approved", summary.approved],
          ["Duplicates skipped", summary.duplicatesSkipped],
          ["Suppressed skipped", summary.suppressedSkipped],
          ["Missing email", summary.missingEmail],
          ["Errors", summary.errors],
          ["Rejected", summary.rejected]
        ].map(([label, value]) => (
          <Card key={String(label)} className="p-4">
            <div className="text-xs text-neutral-500">{label}</div>
            <div className="mt-1 text-2xl font-semibold">{value}</div>
          </Card>
        ))}
      </div>

      {localResults.length > 0 && (
        <Card>
          <CardHeader>
            <div>
              <h3 className="text-lg font-semibold">Results preview</h3>
              <p className="text-sm text-neutral-600">Approve or reject before adding leads to the main table.</p>
            </div>
            <Badge tone="gold">{state.provider ?? "Mock provider"}</Badge>
          </CardHeader>
          <form action={saveAction}>
            <input type="hidden" name="runId" value={state.runId ?? ""} />
            <input type="hidden" name="results" value={JSON.stringify(localResults)} />
            <div className="mb-3 flex flex-wrap gap-2">
              <Button type="button" variant="secondary" onClick={() => setLocalResults((rows) => rows.map((lead) => lead.duplicate || lead.suppressed ? lead : { ...lead, approved: true, rejected: false }))}>
                <Check className="h-4 w-4" />
                Approve selected leads
              </Button>
              <Button type="button" variant="ghost" onClick={() => setLocalResults((rows) => rows.map((lead) => lead.approved ? { ...lead, approved: false, rejected: true } : lead))}>
                <X className="h-4 w-4" />
                Reject selected leads
              </Button>
              <Button disabled={savePending}>
                <ShieldCheck className="h-4 w-4" />
                Add approved leads to Leads
              </Button>
              <Button name="scoreAfterSave" value="true" disabled={savePending} variant="secondary">
                Send selected to AI scoring
              </Button>
              <Button type="button" variant="ghost" onClick={exportResults}>
                Export discovery results
              </Button>
            </div>
          </form>
          <TableWrap>
            <div className="max-h-[50vh] overflow-auto">
              <Table className="min-w-[2200px]">
                <thead className="sticky top-0 bg-neutral-50 text-xs uppercase text-neutral-500">
                  <tr>
                    <th className="px-3 py-3">Decision</th>
                    <th className="px-3 py-3">Company</th>
                    <th className="px-3 py-3">Phone</th>
                    <th className="px-3 py-3">Email</th>
                    <th className="px-3 py-3">Website</th>
                    <th className="px-3 py-3">Location</th>
                    <th className="px-3 py-3">Country</th>
                    <th className="px-3 py-3">Source</th>
                    <th className="px-3 py-3">Source URL</th>
                    <th className="px-3 py-3">Contact page URL</th>
                    <th className="px-3 py-3">Google Place ID</th>
                    <th className="px-3 py-3">Google rating</th>
                    <th className="px-3 py-3">Reviews</th>
                    <th className="px-3 py-3">Confidence</th>
                    <th className="px-3 py-3">Notes</th>
                    <th className="px-3 py-3">Checks</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/10">
                  {localResults.map((lead) => (
                    <tr key={lead.previewId}>
                      <td className="px-3 py-3">
                        <div className="flex gap-1">
                          <Button type="button" variant={lead.approved ? "secondary" : "ghost"} className="h-9 px-3" disabled={lead.duplicate || lead.suppressed} onClick={() => updateLead(lead.previewId, { approved: true, rejected: false })}>Approve</Button>
                          <Button type="button" variant={lead.rejected ? "danger" : "ghost"} className="h-9 px-3" onClick={() => updateLead(lead.previewId, { approved: false, rejected: true })}>Reject</Button>
                        </div>
                      </td>
                      <td className="px-3 py-3 font-medium">{lead.companyName}</td>
                      <td className="px-3 py-3">{lead.phone}</td>
                      <td className="px-3 py-3">{lead.email ?? "Missing"}</td>
                      <td className="px-3 py-3">{lead.website ? <a className="text-gold-700 underline" href={lead.website} target="_blank">{lead.website}</a> : "Missing"}</td>
                      <td className="px-3 py-3">{lead.location}</td>
                      <td className="px-3 py-3">{lead.country}</td>
                      <td className="px-3 py-3">{lead.sourcePlatform}</td>
                      <td className="px-3 py-3"><a className="text-gold-700 underline" href={lead.sourceUrl} target="_blank">Source</a></td>
                      <td className="px-3 py-3">{lead.contactPageUrl ? <a className="text-gold-700 underline" href={lead.contactPageUrl} target="_blank">Contact</a> : ""}</td>
                      <td className="px-3 py-3">{lead.googlePlaceId}</td>
                      <td className="px-3 py-3">{lead.googleRating ?? ""}</td>
                      <td className="px-3 py-3">{lead.googleReviewsCount ?? ""}</td>
                      <td className="px-3 py-3">{lead.confidenceScore}</td>
                      <td className="max-w-[260px] px-3 py-3">{lead.leadSourceNotes}</td>
                      <td className="px-3 py-3">
                        {lead.missingEmail ? <StatusBadge status="Missing Email" /> : lead.duplicate ? <StatusBadge status="Duplicate" /> : lead.suppressed ? <StatusBadge status="Suppressed" /> : <StatusBadge status="Ready for Review" />}
                        <div className="mt-1 text-xs text-neutral-500">{lead.duplicateReason || lead.suppressionReason}</div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          </TableWrap>
        </Card>
      )}

      <Card>
        <CardHeader>
          <div>
            <h3 className="text-lg font-semibold">Previous discovery runs</h3>
            <p className="text-sm text-neutral-600">Most recent discovery activity.</p>
          </div>
        </CardHeader>
        <TableWrap>
          <Table>
            <thead className="bg-neutral-50 text-xs uppercase text-neutral-500">
              <tr><th className="px-3 py-3">Query</th><th className="px-3 py-3">Country</th><th className="px-3 py-3">Provider</th><th className="px-3 py-3">Found</th><th className="px-3 py-3">Status</th></tr>
            </thead>
            <tbody className="divide-y divide-black/10">
              {runs.map((run) => (
                <tr key={run.id}>
                  <td className="px-3 py-3">{run.query}</td>
                  <td className="px-3 py-3">{run.country}</td>
                  <td className="px-3 py-3">{run.provider}</td>
                  <td className="px-3 py-3">{run.leadsFound}</td>
                  <td className="px-3 py-3"><StatusBadge status={run.status} /></td>
                </tr>
              ))}
            </tbody>
          </Table>
        </TableWrap>
      </Card>
    </div>
  );
}
