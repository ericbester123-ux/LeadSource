import { prisma } from "@/lib/prisma";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { Input, Select } from "@/components/ui/input";
import { Table, TableWrap } from "@/components/ui/table";
import { complianceStatuses, contactTypes } from "@/lib/constants";
import { formatDate } from "@/lib/lead-utils";
import { manuallyApproveCompliance, manuallyFailCompliance, runPendingComplianceChecks, runSelectedComplianceChecks } from "./actions";

export const dynamic = "force-dynamic";

function searchValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value ?? "";
}

export default async function CompliancePage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const country = searchValue(params.country);
  const status = searchValue(params.status);
  const contactType = searchValue(params.contactType);
  const suppression = searchValue(params.suppression);

  const [leads, suppressions, audits] = await Promise.all([
    prisma.lead.findMany({
      where: {
        ...(country ? { country } : {}),
        ...(contactType ? { contactType } : {}),
        ...(status ? { complianceCheck: { status } } : {})
      },
      include: { complianceCheck: true, emailVerification: true },
      orderBy: { updatedAt: "desc" }
    }),
    prisma.suppressionListEntry.findMany({ select: { email: true, reason: true } }),
    prisma.auditLog.findMany({
      where: { action: { contains: "Compliance" } },
      orderBy: { createdAt: "desc" },
      take: 12
    })
  ]);
  const suppressed = new Map(suppressions.map((entry) => [entry.email.toLowerCase(), entry.reason]));
  const filtered = leads.filter((lead) => {
    const isSuppressed = suppressed.has(lead.email.toLowerCase());
    if (suppression === "suppressed" && !isSuppressed) return false;
    if (suppression === "clear" && isSuppressed) return false;
    return true;
  });
  const countries = [...new Set(leads.map((lead) => lead.country).filter(Boolean))].sort();

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 xl:flex-row xl:items-center">
        <div>
          <h2 className="text-2xl font-semibold">Compliance</h2>
          <p className="mt-1 text-sm text-neutral-600">Operational UK and US outreach guardrails with manual review and audit history.</p>
        </div>
        <form action={runPendingComplianceChecks}>
          <Button>Run all pending checks</Button>
        </form>
      </div>

      <Card className="border-gold-200 bg-gold-50 text-sm text-gold-900">
        LeadSource provides operational compliance checks and workflow guardrails, but it is not legal advice. Review your outreach process with a qualified legal professional before running live campaigns.
      </Card>

      <Card>
        <form className="grid gap-3 md:grid-cols-5">
          <Select name="country" defaultValue={country}>
            <option value="">All countries</option>
            {countries.map((item) => <option key={item}>{item}</option>)}
          </Select>
          <Select name="status" defaultValue={status}>
            <option value="">All statuses</option>
            {complianceStatuses.map((item) => <option key={item}>{item}</option>)}
          </Select>
          <Select name="contactType" defaultValue={contactType}>
            <option value="">All contact types</option>
            {contactTypes.map((item) => <option key={item}>{item}</option>)}
          </Select>
          <Select name="suppression" defaultValue={suppression}>
            <option value="">Suppression status</option>
            <option value="suppressed">Suppressed only</option>
            <option value="clear">Not suppressed</option>
          </Select>
          <Button>Apply filters</Button>
        </form>
      </Card>

      <form id="compliance-selected-form" action={runSelectedComplianceChecks} />
      <Card>
          <CardHeader>
            <div>
              <h3 className="text-lg font-semibold">Leads Compliance Table</h3>
              <p className="text-sm text-neutral-600">Select leads to re-check against suppression, verification, contact type, and UK/US rules.</p>
            </div>
            <Button form="compliance-selected-form">Run selected checks</Button>
          </CardHeader>
          <TableWrap>
            <div className="max-h-[62vh] overflow-auto">
              <Table className="min-w-[1700px]">
                <thead className="sticky top-0 bg-neutral-50 text-xs uppercase text-neutral-500">
                  <tr>
                    <th className="px-3 py-3">Select</th>
                    <th className="px-3 py-3">Lead</th>
                    <th className="px-3 py-3">Country</th>
                    <th className="px-3 py-3">Contact type</th>
                    <th className="px-3 py-3">Status</th>
                    <th className="px-3 py-3">Suppression</th>
                    <th className="px-3 py-3">UK indicators</th>
                    <th className="px-3 py-3">US indicators</th>
                    <th className="px-3 py-3">Risk notes</th>
                    <th className="px-3 py-3">Manual approval</th>
                    <th className="px-3 py-3">Manual failure</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/10">
                  {filtered.map((lead) => {
                    const status = lead.complianceCheck?.status ?? "Pending Review";
                    const suppressionReason = suppressed.get(lead.email.toLowerCase());
                    const isUk = /united kingdom|uk|england/i.test(lead.country);
                    const isUs = /united states|usa|us/i.test(lead.country);
                    return (
                      <tr key={lead.id} className="align-top">
                        <td className="px-3 py-3"><input form="compliance-selected-form" type="checkbox" name="leadIds" value={lead.id} /></td>
                        <td className="px-3 py-3">
                          <div className="font-medium">{lead.companyName}</div>
                          <div className="text-xs text-neutral-500">{lead.email}</div>
                          <div className="mt-1 flex flex-wrap gap-1">
                            {lead.bounced && <Badge tone="red">Bounced</Badge>}
                            {lead.unsubscribed && <Badge tone="red">Unsubscribed</Badge>}
                            {lead.doNotContact && <Badge tone="red">Do Not Contact</Badge>}
                            {lead.emailVerification?.status === "Invalid" && <Badge tone="red">Invalid Email</Badge>}
                          </div>
                        </td>
                        <td className="px-3 py-3">{lead.country}</td>
                        <td className="px-3 py-3">{lead.contactType}</td>
                        <td className="px-3 py-3"><StatusBadge status={status} /></td>
                        <td className="px-3 py-3">{suppressionReason ? <Badge tone="red">{suppressionReason}</Badge> : <Badge tone="green">Clear</Badge>}</td>
                        <td className="max-w-[230px] px-3 py-3 text-xs leading-5">
                          {isUk ? (
                            <>
                              <div>Named corporate: {lead.contactType === "Named Corporate Email" ? "manual approval" : "not triggered"}</div>
                              <div>High-risk contact: {["Sole Trader", "Partnership", "Individual Subscriber", "Unknown"].includes(lead.contactType) ? "yes" : "no"}</div>
                            </>
                          ) : "Not UK profile"}
                        </td>
                        <td className="max-w-[230px] px-3 py-3 text-xs leading-5">{isUs ? "Unsubscribe link and business address required before live sending." : "Not US profile"}</td>
                        <td className="max-w-[280px] px-3 py-3 text-sm text-neutral-700">{lead.complianceCheck?.notes ?? "No notes yet."}</td>
                        <td className="px-3 py-3">
                          <form action={manuallyApproveCompliance} className="grid min-w-[260px] gap-2">
                            <input type="hidden" name="leadId" value={lead.id} />
                            <Input name="reason" placeholder="Approval reason" required />
                            <Button variant="secondary">Approve</Button>
                          </form>
                        </td>
                        <td className="px-3 py-3">
                          <form action={manuallyFailCompliance} className="grid min-w-[260px] gap-2">
                            <input type="hidden" name="leadId" value={lead.id} />
                            <Input name="reason" placeholder="Failure reason" required />
                            <Button variant="danger">Fail</Button>
                          </form>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </Table>
            </div>
          </TableWrap>
      </Card>

      <Card>
        <CardHeader><h3 className="text-lg font-semibold">Compliance Audit Log</h3></CardHeader>
        <div className="divide-y divide-black/10">
          {audits.map((audit) => (
            <div key={audit.id} className="grid gap-2 py-3 text-sm md:grid-cols-[220px_1fr_160px]">
              <div className="font-medium">{audit.action}</div>
              <div className="text-neutral-600">{audit.reason}</div>
              <div className="text-neutral-500">{formatDate(audit.createdAt)}</div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
