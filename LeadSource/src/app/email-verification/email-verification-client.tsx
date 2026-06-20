"use client";

import { useMemo, useState } from "react";
import { Download, FileCheck2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Select, Textarea } from "@/components/ui/input";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { Table, TableWrap } from "@/components/ui/table";
import { verificationStatuses } from "@/lib/constants";
import { VerificationLeadWithInclude } from "@/lib/lead-include";
import { csvEscape, formatDate } from "@/lib/lead-utils";
import type { EmailVerificationProviderStatus } from "@/lib/email-verification/emailVerificationProviderFactory";
import { overrideVerification, verifyAllUnverifiedLeads, verifySelectedLeads } from "./actions";

type VerificationLead = VerificationLeadWithInclude;

function statusFor(lead: VerificationLead) {
  return lead.emailVerification?.status ?? "Not Checked";
}

export function EmailVerificationClient({ leads, providerStatus }: { leads: VerificationLead[]; providerStatus: EmailVerificationProviderStatus }) {
  const [selected, setSelected] = useState<string[]>([]);
  const [status, setStatus] = useState("");
  const [query, setQuery] = useState("");
  const [overrideLead, setOverrideLead] = useState<VerificationLead | null>(null);

  const filtered = useMemo(() => leads.filter((lead) => {
    const haystack = `${lead.email} ${lead.companyName} ${lead.country} ${statusFor(lead)}`.toLowerCase();
    return (!status || statusFor(lead) === status) && (!query || haystack.includes(query.toLowerCase()));
  }), [leads, query, status]);

  const groups = {
    notChecked: leads.filter((lead) => statusFor(lead) === "Not Checked").length,
    verified: leads.filter((lead) => statusFor(lead) === "Valid").length,
    risky: leads.filter((lead) => ["Invalid", "Risky", "Catch-All", "Unknown"].includes(statusFor(lead))).length
  };

  function toggle(id: string) {
    setSelected((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  }

  function exportCsv() {
    const rows = [
      ["Email", "Company", "Status", "Provider", "Reason", "Confidence", "Details", "Verified at", "Manual override"].join(","),
      ...filtered.map((lead) => [
        lead.email,
        lead.companyName,
        statusFor(lead),
        lead.emailVerification?.provider,
        lead.emailVerification?.reason,
        lead.emailVerification?.confidence,
        lead.emailVerification?.resultDetails,
        formatDate(lead.emailVerification?.verifiedAt),
        lead.emailVerification?.manuallyApproved ? "Yes" : "No"
      ].map(csvEscape).join(","))
    ].join("\n");
    const blob = new Blob([rows], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "leadsource-email-verification.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h2 className="text-2xl font-semibold">Email Verification</h2>
          <p className="mt-1 text-sm text-neutral-600">Provider-backed verification with local syntax fallback.</p>
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="secondary" onClick={exportCsv}><Download className="h-4 w-4" /> Export results</Button>
          <form action={verifyAllUnverifiedLeads}><Button><FileCheck2 className="h-4 w-4" /> Verify all unverified</Button></form>
        </div>
      </div>

      <Card className="flex flex-wrap items-center gap-3">
        <Badge tone="black">Selected provider: {providerStatus.providerLabel}</Badge>
        <Badge tone={providerStatus.apiKeyConfigured ? "green" : "gold"}>API key {providerStatus.apiKeyConfigured ? "configured" : "missing"}</Badge>
        <Badge tone={providerStatus.zeroBounceConfigured ? "green" : "gray"}>ZeroBounce {providerStatus.zeroBounceConfigured ? "configured" : "missing"}</Badge>
        <Badge tone={providerStatus.neverBounceConfigured ? "green" : "gray"}>NeverBounce {providerStatus.neverBounceConfigured ? "configured" : "missing"}</Badge>
        {providerStatus.localFallbackOnly && (
          <div className="w-full rounded-md border border-gold-200 bg-gold-50 p-3 text-sm text-gold-900">
            Local fallback is active. Provider verification will not fail the app when API keys are missing.
          </div>
        )}
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="p-4"><div className="text-xs text-neutral-500">Not checked</div><div className="mt-1 text-2xl font-semibold">{groups.notChecked}</div></Card>
        <Card className="p-4"><div className="text-xs text-neutral-500">Verified valid</div><div className="mt-1 text-2xl font-semibold">{groups.verified}</div></Card>
        <Card className="p-4"><div className="text-xs text-neutral-500">Invalid/risky/unknown</div><div className="mt-1 text-2xl font-semibold">{groups.risky}</div></Card>
      </div>

      <Card>
        <div className="grid gap-3 md:grid-cols-[1fr_220px]">
          <Input placeholder="Search email, company, or country" value={query} onChange={(event) => setQuery(event.target.value)} />
          <Select value={status} onChange={(event) => setStatus(event.target.value)}>
            <option value="">All statuses</option>
            {verificationStatuses.map((item) => <option key={item}>{item}</option>)}
          </Select>
        </div>
      </Card>

      <form action={verifySelectedLeads}>
        {selected.map((id) => <input key={id} type="hidden" name="leadIds" value={id} />)}
        <Card className="mb-4 flex flex-wrap items-center gap-2">
          <Badge tone="black">{selected.length} selected</Badge>
          <Button variant="secondary" disabled={!selected.length}><FileCheck2 className="h-4 w-4" /> Verify selected with provider</Button>
        </Card>
      </form>

      <TableWrap>
        <div className="max-h-[68vh] overflow-auto">
          <Table className="min-w-[1300px]">
            <thead className="sticky top-0 bg-neutral-50 text-xs uppercase text-neutral-500">
              <tr>
                <th className="px-3 py-3"></th>
                <th className="px-3 py-3">Email</th>
                <th className="px-3 py-3">Company</th>
                <th className="px-3 py-3">Country</th>
                <th className="px-3 py-3">Status</th>
                <th className="px-3 py-3">Provider</th>
                <th className="px-3 py-3">Reason</th>
                <th className="px-3 py-3">Confidence</th>
                <th className="px-3 py-3">Result</th>
                <th className="px-3 py-3">Verified date</th>
                <th className="px-3 py-3">Bounced</th>
                <th className="px-3 py-3">Manual approval</th>
                <th className="px-3 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/10">
              {filtered.map((lead) => (
                <tr key={lead.id}>
                  <td className="px-3 py-3"><input type="checkbox" checked={selected.includes(lead.id)} onChange={() => toggle(lead.id)} className="h-4 w-4 accent-gold-500" /></td>
                  <td className="px-3 py-3 font-medium">{lead.email}</td>
                  <td className="px-3 py-3">{lead.companyName}</td>
                  <td className="px-3 py-3">{lead.country}</td>
                  <td className="px-3 py-3"><StatusBadge status={statusFor(lead)} /></td>
                  <td className="px-3 py-3">{lead.emailVerification?.provider ?? "local"}</td>
                  <td className="px-3 py-3">{lead.emailVerification?.reason}</td>
                  <td className="px-3 py-3">{typeof lead.emailVerification?.confidence === "number" ? `${Math.round(lead.emailVerification.confidence * 100)}%` : ""}</td>
                  <td className="max-w-[320px] px-3 py-3">{lead.emailVerification?.resultDetails}</td>
                  <td className="px-3 py-3">{formatDate(lead.emailVerification?.verifiedAt)}</td>
                  <td className="px-3 py-3">{lead.bounced ? "Yes" : "No"}</td>
                  <td className="px-3 py-3">{lead.emailVerification?.manuallyApproved ? "Yes" : "No"}</td>
                  <td className="px-3 py-3"><Button type="button" variant="ghost" onClick={() => setOverrideLead(lead)}>Override</Button></td>
                </tr>
              ))}
            </tbody>
          </Table>
        </div>
      </TableWrap>

      {overrideLead && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4">
          <form action={overrideVerification} className="w-full max-w-lg rounded-lg bg-white p-5 shadow-glow">
            <input type="hidden" name="leadId" value={overrideLead.id} />
            <h3 className="text-lg font-semibold">Manual verification override</h3>
            <p className="mt-1 text-sm text-neutral-600">{overrideLead.email}</p>
            <div className="mt-4 grid gap-4">
              <label className="grid gap-1 text-sm font-medium">Status<Select name="status" defaultValue={statusFor(overrideLead)}>{verificationStatuses.map((item) => <option key={item}>{item}</option>)}</Select></label>
              <label className="grid gap-1 text-sm font-medium">Reason<Textarea name="reason" required defaultValue="Manual verification review." /></label>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => setOverrideLead(null)}>Cancel</Button>
              <Button>Save override</Button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
