"use client";

import { useMemo, useState, useTransition } from "react";
import { Campaign } from "@prisma/client";
import {
  Check,
  Download,
  Edit3,
  FileCheck2,
  Filter,
  Plus,
  Search,
  ShieldAlert,
  Sparkles,
  Trash2,
  UploadCloud,
  X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Select, Textarea } from "@/components/ui/input";
import { StatusBadge, Badge } from "@/components/ui/badge";
import { Table, TableWrap } from "@/components/ui/table";
import {
  complianceStatuses,
  contactTypes,
  ghlStatuses,
  leadStatuses,
  qualityLabels,
  verificationStatuses
} from "@/lib/constants";
import { LeadWithInclude } from "@/lib/lead-include";
import { csvEscape, formatDate } from "@/lib/lead-utils";
import { bulkLeadAction, createLead, deleteLead, updateLead } from "./actions";

type LeadRow = LeadWithInclude;

const columns = [
  "First name",
  "Last name",
  "Full name",
  "Email",
  "Phone",
  "Company name",
  "Website",
  "Location",
  "City",
  "State/region",
  "Country",
  "Industry",
  "Niche",
  "Lead source",
  "Source URL",
  "Personalisation note",
  "AI lead score",
  "Lead quality label",
  "Compliance status",
  "Contact type",
  "Email verification status",
  "Last contacted date",
  "Next follow-up date",
  "Campaign assigned",
  "Tags",
  "Notes",
  "Do-not-contact",
  "Unsubscribed",
  "Bounced",
  "GHL sync status",
  "Created date",
  "Updated date"
];

function unique(values: (string | null | undefined)[]) {
  return Array.from(new Set(values.filter((value): value is string => Boolean(value)))).sort();
}

function rowValues(lead: LeadRow) {
  return [
    lead.firstName,
    lead.lastName,
    lead.fullName,
    lead.email,
    lead.phone,
    lead.companyName,
    lead.website,
    lead.location,
    lead.city,
    lead.stateRegion,
    lead.country,
    lead.industry,
    lead.niche,
    lead.leadSource?.name ?? lead.sourcePlatform,
    lead.sourceUrl,
    lead.personalisationNote,
    lead.leadScore?.score,
    lead.leadScore?.qualityLabel,
    lead.complianceCheck?.status,
    lead.contactType,
    lead.emailVerification?.status,
    formatDate(lead.lastContactedAt),
    formatDate(lead.nextFollowUpAt),
    lead.campaignEnrollments.map((enrollment) => enrollment.campaign.name).join(", "),
    lead.tags,
    lead.notes,
    lead.doNotContact ? "Yes" : "No",
    lead.unsubscribed ? "Yes" : "No",
    lead.bounced ? "Yes" : "No",
    lead.ghlSyncStatus,
    formatDate(lead.createdAt),
    formatDate(lead.updatedAt)
  ];
}

function dateInput(value?: Date | string | null) {
  if (!value) return "";
  return new Date(value).toISOString().slice(0, 10);
}

function LeadForm({
  lead,
  campaigns,
  onClose
}: {
  lead?: LeadRow | null;
  campaigns: Campaign[];
  onClose: () => void;
}) {
  const action = lead ? updateLead : createLead;

  return (
    <form action={action} className="grid max-h-[78vh] gap-5 overflow-y-auto p-1">
      {lead && <input type="hidden" name="id" value={lead.id} />}
      <div className="grid gap-3 md:grid-cols-3">
        <label className="grid gap-1 text-sm font-medium">
          First name
          <Input name="firstName" defaultValue={lead?.firstName ?? ""} />
        </label>
        <label className="grid gap-1 text-sm font-medium">
          Last name
          <Input name="lastName" defaultValue={lead?.lastName ?? ""} />
        </label>
        <label className="grid gap-1 text-sm font-medium">
          Full name
          <Input name="fullName" defaultValue={lead?.fullName ?? ""} />
        </label>
        <label className="grid gap-1 text-sm font-medium">
          Email
          <Input name="email" type="email" required defaultValue={lead?.email ?? ""} />
        </label>
        <label className="grid gap-1 text-sm font-medium">
          Phone
          <Input name="phone" defaultValue={lead?.phone ?? ""} />
        </label>
        <label className="grid gap-1 text-sm font-medium">
          Company name
          <Input name="companyName" required defaultValue={lead?.companyName ?? ""} />
        </label>
        <label className="grid gap-1 text-sm font-medium">
          Website
          <Input name="website" defaultValue={lead?.website ?? ""} />
        </label>
        <label className="grid gap-1 text-sm font-medium">
          Location
          <Input name="location" defaultValue={lead?.location ?? ""} />
        </label>
        <label className="grid gap-1 text-sm font-medium">
          City
          <Input name="city" defaultValue={lead?.city ?? ""} />
        </label>
        <label className="grid gap-1 text-sm font-medium">
          State/region
          <Input name="stateRegion" defaultValue={lead?.stateRegion ?? ""} />
        </label>
        <label className="grid gap-1 text-sm font-medium">
          Country
          <Input name="country" required defaultValue={lead?.country ?? ""} />
        </label>
        <label className="grid gap-1 text-sm font-medium">
          Industry
          <Input name="industry" defaultValue={lead?.industry ?? ""} />
        </label>
        <label className="grid gap-1 text-sm font-medium">
          Niche
          <Input name="niche" defaultValue={lead?.niche ?? ""} />
        </label>
        <label className="grid gap-1 text-sm font-medium">
          Lead source
          <Input name="sourcePlatform" defaultValue={lead?.sourcePlatform ?? lead?.leadSource?.name ?? "Manual Entry"} />
        </label>
        <label className="grid gap-1 text-sm font-medium md:col-span-2">
          Source URL
          <Input name="sourceUrl" defaultValue={lead?.sourceUrl ?? ""} />
        </label>
        <label className="grid gap-1 text-sm font-medium">
          AI score
          <Input name="score" type="number" min="1" max="100" defaultValue={lead?.leadScore?.score ?? ""} />
        </label>
        <label className="grid gap-1 text-sm font-medium">
          Quality label
          <Select name="qualityLabel" defaultValue={lead?.leadScore?.qualityLabel ?? "Maybe"}>
            {qualityLabels.map((status) => <option key={status}>{status}</option>)}
          </Select>
        </label>
        <label className="grid gap-1 text-sm font-medium">
          Status
          <Select name="status" defaultValue={lead?.status ?? "New"}>
            {leadStatuses.map((status) => <option key={status}>{status}</option>)}
          </Select>
        </label>
        <label className="grid gap-1 text-sm font-medium">
          Compliance status
          <Select name="complianceStatus" defaultValue={lead?.complianceCheck?.status ?? "Pending Review"}>
            {complianceStatuses.map((status) => <option key={status}>{status}</option>)}
          </Select>
        </label>
        <label className="grid gap-1 text-sm font-medium">
          Contact type
          <Select name="contactType" defaultValue={lead?.contactType ?? "Unknown"}>
            {contactTypes.map((status) => <option key={status}>{status}</option>)}
          </Select>
        </label>
        <label className="grid gap-1 text-sm font-medium">
          Verification status
          <Select name="verificationStatus" defaultValue={lead?.emailVerification?.status ?? "Not Checked"}>
            {verificationStatuses.map((status) => <option key={status}>{status}</option>)}
          </Select>
        </label>
        <label className="grid gap-1 text-sm font-medium">
          GHL sync status
          <Select name="ghlSyncStatus" defaultValue={lead?.ghlSyncStatus ?? "Not Ready"}>
            {ghlStatuses.map((status) => <option key={status}>{status}</option>)}
          </Select>
        </label>
        <label className="grid gap-1 text-sm font-medium">
          Campaign assigned
          <Select name="campaignId" defaultValue={lead?.campaignEnrollments[0]?.campaign.id ?? ""}>
            <option value="">No campaign</option>
            {campaigns.map((campaign) => <option key={campaign.id} value={campaign.id}>{campaign.name}</option>)}
          </Select>
        </label>
        <label className="grid gap-1 text-sm font-medium">
          Last contacted date
          <Input name="lastContactedAt" type="date" defaultValue={dateInput(lead?.lastContactedAt)} />
        </label>
        <label className="grid gap-1 text-sm font-medium">
          Next follow-up date
          <Input name="nextFollowUpAt" type="date" defaultValue={dateInput(lead?.nextFollowUpAt)} />
        </label>
      </div>
      <label className="grid gap-1 text-sm font-medium">
        Personalisation note
        <Textarea name="personalisationNote" defaultValue={lead?.personalisationNote ?? ""} />
      </label>
      <div className="grid gap-3 md:grid-cols-2">
        <label className="grid gap-1 text-sm font-medium">
          Tags
          <Input name="tags" defaultValue={lead?.tags ?? ""} />
        </label>
        <label className="grid gap-1 text-sm font-medium">
          Notes
          <Input name="notes" defaultValue={lead?.notes ?? ""} />
        </label>
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        {[
          ["doNotContact", "Do-not-contact", lead?.doNotContact],
          ["unsubscribed", "Unsubscribed", lead?.unsubscribed],
          ["bounced", "Bounced", lead?.bounced]
        ].map(([name, label, checked]) => (
          <label key={String(name)} className="flex items-center gap-3 rounded-md border border-black/10 p-3 text-sm">
            <input name={String(name)} type="checkbox" defaultChecked={Boolean(checked)} className="h-4 w-4 accent-gold-500" />
            {label}
          </label>
        ))}
      </div>
      <div className="sticky bottom-0 flex justify-end gap-2 border-t border-black/10 bg-white py-4">
        <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
        <Button type="submit">{lead ? "Save lead" : "Add lead"}</Button>
      </div>
    </form>
  );
}

export function LeadsClient({ leads, campaigns }: { leads: LeadRow[]; campaigns: Campaign[] }) {
  const [query, setQuery] = useState("");
  const [country, setCountry] = useState("");
  const [city, setCity] = useState("");
  const [status, setStatus] = useState("");
  const [score, setScore] = useState("");
  const [campaign, setCampaign] = useState("");
  const [compliance, setCompliance] = useState("");
  const [verification, setVerification] = useState("");
  const [ghl, setGhl] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [modalLead, setModalLead] = useState<LeadRow | null | undefined>(undefined);
  const [deleteTarget, setDeleteTarget] = useState<LeadRow | null>(null);
  const [isPending, startTransition] = useTransition();

  const filtered = useMemo(() => {
    return leads.filter((lead) => {
      const haystack = rowValues(lead).join(" ").toLowerCase();
      const campaignNames = lead.campaignEnrollments.map((enrollment) => enrollment.campaign.name);
      return (
        (!query || haystack.includes(query.toLowerCase())) &&
        (!country || lead.country === country) &&
        (!city || lead.city === city) &&
        (!status || lead.status === status) &&
        (!score || (lead.leadScore?.score ?? 0) >= Number(score)) &&
        (!campaign || campaignNames.includes(campaign)) &&
        (!compliance || lead.complianceCheck?.status === compliance) &&
        (!verification || lead.emailVerification?.status === verification) &&
        (!ghl || lead.ghlSyncStatus === ghl)
      );
    });
  }, [campaign, city, compliance, country, ghl, leads, query, score, status, verification]);

  function toggleSelected(id: string) {
    setSelected((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  }

  function exportCsv() {
    const csv = [columns.join(","), ...filtered.map((lead) => rowValues(lead).map(csvEscape).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "leadsource-leads.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 xl:flex-row xl:items-center">
        <div>
          <h2 className="text-2xl font-semibold">Leads</h2>
          <p className="mt-1 text-sm text-neutral-600">Review, edit, filter, export, and safely prepare leads for later stages.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="secondary" onClick={exportCsv}>
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
          <Button type="button" onClick={() => setModalLead(null)}>
            <Plus className="h-4 w-4" />
            Add lead
          </Button>
        </div>
      </div>

      <Card>
        <div className="grid gap-3 lg:grid-cols-[1.3fr_repeat(4,1fr)] xl:grid-cols-[1.4fr_repeat(8,1fr)]">
          <label className="relative">
            <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-neutral-400" />
            <Input className="pl-9" placeholder="Search leads" value={query} onChange={(event) => setQuery(event.target.value)} />
          </label>
          <Select value={country} onChange={(event) => setCountry(event.target.value)}>
            <option value="">Country</option>
            {unique(leads.map((lead) => lead.country)).map((item) => <option key={item}>{item}</option>)}
          </Select>
          <Select value={city} onChange={(event) => setCity(event.target.value)}>
            <option value="">City</option>
            {unique(leads.map((lead) => lead.city)).map((item) => <option key={item}>{item}</option>)}
          </Select>
          <Select value={status} onChange={(event) => setStatus(event.target.value)}>
            <option value="">Status</option>
            {leadStatuses.map((item) => <option key={item}>{item}</option>)}
          </Select>
          <Select value={score} onChange={(event) => setScore(event.target.value)}>
            <option value="">Min score</option>
            <option value="50">50+</option>
            <option value="70">70+</option>
            <option value="85">85+</option>
          </Select>
          <Select value={campaign} onChange={(event) => setCampaign(event.target.value)}>
            <option value="">Campaign</option>
            {campaigns.map((item) => <option key={item.id}>{item.name}</option>)}
          </Select>
          <Select value={compliance} onChange={(event) => setCompliance(event.target.value)}>
            <option value="">Compliance</option>
            {complianceStatuses.map((item) => <option key={item}>{item}</option>)}
          </Select>
          <Select value={verification} onChange={(event) => setVerification(event.target.value)}>
            <option value="">Verification</option>
            {verificationStatuses.map((item) => <option key={item}>{item}</option>)}
          </Select>
          <Select value={ghl} onChange={(event) => setGhl(event.target.value)}>
            <option value="">GHL status</option>
            {ghlStatuses.map((item) => <option key={item}>{item}</option>)}
          </Select>
        </div>
      </Card>

      <form action={bulkLeadAction}>
        {selected.map((id) => <input key={id} type="hidden" name="leadIds" value={id} />)}
        <Card className="mb-4">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="black">{selected.length} selected</Badge>
            <Button name="bulkAction" value="approve" variant="secondary" disabled={!selected.length}>
              <Check className="h-4 w-4" />
              Bulk approve
            </Button>
            <Button name="bulkAction" value="reject" variant="ghost" disabled={!selected.length}>
              <X className="h-4 w-4" />
              Bulk reject
            </Button>
            <Button name="bulkAction" value="verify" variant="ghost" disabled={!selected.length}>
              <FileCheck2 className="h-4 w-4" />
              Bulk verify
            </Button>
            <Button name="bulkAction" value="score" variant="ghost" disabled={!selected.length}>
              <Sparkles className="h-4 w-4" />
              Bulk score
            </Button>
            <Select name="bulkCampaignId" className="w-64" defaultValue="">
              <option value="">Choose campaign</option>
              {campaigns.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </Select>
            <Button name="bulkAction" value="assignCampaign" variant="ghost" disabled={!selected.length}>
              <UploadCloud className="h-4 w-4" />
              Assign
            </Button>
            <Button name="bulkAction" value="suppress" variant="ghost" disabled={!selected.length}>
              <ShieldAlert className="h-4 w-4" />
              Suppress
            </Button>
            <Button name="bulkAction" value="syncGhl" variant="ghost" disabled={!selected.length}>
              Bulk sync to GHL
            </Button>
          </div>
        </Card>
      </form>

      <TableWrap>
        <div className="max-h-[68vh] overflow-auto">
          <Table className="min-w-[3600px]">
            <thead className="sticky top-0 z-[1] bg-neutral-50 text-xs uppercase text-neutral-500">
              <tr>
                <th className="px-3 py-3">
                  <input
                    type="checkbox"
                    checked={filtered.length > 0 && filtered.every((lead) => selected.includes(lead.id))}
                    onChange={(event) => setSelected(event.target.checked ? filtered.map((lead) => lead.id) : [])}
                    className="h-4 w-4 accent-gold-500"
                  />
                </th>
                <th className="sticky left-0 bg-neutral-50 px-3 py-3">Actions</th>
                {columns.map((column) => <th key={column} className="px-3 py-3">{column}</th>)}
              </tr>
            </thead>
            <tbody className="divide-y divide-black/10 bg-white">
              {filtered.map((lead) => (
                <tr key={lead.id} className="align-top">
                  <td className="px-3 py-3">
                    <input
                      type="checkbox"
                      checked={selected.includes(lead.id)}
                      onChange={() => toggleSelected(lead.id)}
                      className="h-4 w-4 accent-gold-500"
                    />
                  </td>
                  <td className="sticky left-0 bg-white px-3 py-3">
                    <div className="flex gap-1">
                      <Button type="button" variant="ghost" className="h-9 w-9 px-0" title="Edit lead" onClick={() => setModalLead(lead)}>
                        <Edit3 className="h-4 w-4" />
                      </Button>
                      <Button type="button" variant="ghost" className="h-9 w-9 px-0 text-red-700" title="Delete lead" onClick={() => setDeleteTarget(lead)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                  {rowValues(lead).map((cell, index) => (
                    <td key={`${lead.id}-${columns[index]}`} className="max-w-[220px] px-3 py-3 text-sm text-neutral-700">
                      {columns[index]?.includes("status") || columns[index] === "Compliance status" || columns[index] === "Email verification status" ? (
                        <StatusBadge status={String(cell || "")} />
                      ) : columns[index] === "Website" || columns[index] === "Source URL" ? (
                        cell ? <a className="text-gold-700 underline" href={String(cell)} target="_blank">{String(cell)}</a> : ""
                      ) : (
                        <span className="line-clamp-3">{String(cell ?? "")}</span>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </Table>
        </div>
      </TableWrap>

      {modalLead !== undefined && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4">
          <div className="w-full max-w-6xl rounded-lg bg-white p-5 shadow-glow">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold">{modalLead ? "Edit lead" : "Add lead manually"}</h3>
              <Button type="button" variant="ghost" onClick={() => setModalLead(undefined)}>Close</Button>
            </div>
            <LeadForm lead={modalLead} campaigns={campaigns} onClose={() => setModalLead(undefined)} />
          </div>
        </div>
      )}

      {deleteTarget && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-lg bg-white p-5 shadow-glow">
            <h3 className="text-lg font-semibold">Delete lead?</h3>
            <p className="mt-2 text-sm text-neutral-600">
              This will remove {deleteTarget.email} and write an audit log.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => setDeleteTarget(null)}>Cancel</Button>
              <Button
                type="button"
                variant="danger"
                disabled={isPending}
                onClick={() => {
                  const formData = new FormData();
                  formData.set("id", deleteTarget.id);
                  startTransition(async () => {
                    await deleteLead(formData);
                    setDeleteTarget(null);
                  });
                }}
              >
                Delete lead
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
