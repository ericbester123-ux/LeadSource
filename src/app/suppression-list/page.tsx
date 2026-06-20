import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { Input, Select, Textarea } from "@/components/ui/input";
import { Table, TableWrap } from "@/components/ui/table";
import { formatDate } from "@/lib/lead-utils";
import { addSuppressionEntry, removeSuppressionEntry } from "./actions";

export const dynamic = "force-dynamic";

export default async function SuppressionListPage() {
  const [entries, matchedLeads] = await Promise.all([
    prisma.suppressionListEntry.findMany({ orderBy: { createdAt: "desc" } }),
    prisma.lead.findMany({ where: { OR: [{ doNotContact: true }, { unsubscribed: true }, { bounced: true }] }, orderBy: { updatedAt: "desc" }, take: 20 })
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">Suppression List</h2>
        <p className="mt-1 text-sm text-neutral-600">Block emails from outreach and keep compliance checks aligned with unsubscribe, bounce, and do-not-contact states.</p>
      </div>

      <Card>
        <CardHeader><h3 className="text-lg font-semibold">Add Suppression</h3></CardHeader>
        <form action={addSuppressionEntry} className="grid gap-3 md:grid-cols-[1fr_220px_1fr_auto]">
          <Input name="email" type="email" placeholder="person@example.com" required />
          <Select name="reason" defaultValue="Manual Suppression">
            <option>Manual Suppression</option>
            <option>Unsubscribed</option>
            <option>Bounced</option>
            <option>Do Not Contact</option>
            <option>Compliance Risk</option>
          </Select>
          <Textarea name="notes" placeholder="Notes or source" className="min-h-10" />
          <Button>Add</Button>
        </form>
      </Card>

      <Card>
        <CardHeader>
          <div>
            <h3 className="text-lg font-semibold">Suppressed Emails</h3>
            <p className="text-sm text-neutral-600">{entries.length} addresses are blocked from sending.</p>
          </div>
        </CardHeader>
        <TableWrap>
          <Table>
            <thead className="bg-neutral-50 text-xs uppercase text-neutral-500">
              <tr><th className="px-3 py-3">Email</th><th className="px-3 py-3">Reason</th><th className="px-3 py-3">Source</th><th className="px-3 py-3">Added</th><th className="px-3 py-3">Action</th></tr>
            </thead>
            <tbody className="divide-y divide-black/10">
              {entries.map((entry) => (
                <tr key={entry.id}>
                  <td className="px-3 py-3 font-medium">{entry.email}</td>
                  <td className="px-3 py-3">{entry.reason}<div className="text-xs text-neutral-500">{entry.notes}</div></td>
                  <td className="px-3 py-3">{entry.source ?? "Manual"}</td>
                  <td className="px-3 py-3">{formatDate(entry.createdAt)}</td>
                  <td className="px-3 py-3">
                    <form action={removeSuppressionEntry}>
                      <input type="hidden" name="id" value={entry.id} />
                      <Button variant="ghost">Remove</Button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        </TableWrap>
      </Card>

      <Card>
        <CardHeader><h3 className="text-lg font-semibold">Blocked Lead Signals</h3></CardHeader>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {matchedLeads.map((lead) => (
            <div key={lead.id} className="rounded-md border border-black/10 p-3 text-sm">
              <div className="font-medium">{lead.companyName}</div>
              <div className="text-neutral-600">{lead.email}</div>
              <div className="mt-2 text-xs text-neutral-500">
                {lead.unsubscribed ? "Unsubscribed " : ""}{lead.bounced ? "Bounced " : ""}{lead.doNotContact ? "Do Not Contact" : ""}
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
