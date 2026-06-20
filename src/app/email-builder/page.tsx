import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { Input, Textarea } from "@/components/ui/input";
import { Table, TableWrap } from "@/components/ui/table";
import { deleteEmailTemplateAction, saveEmailTemplateAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function EmailBuilderPage() {
  const [templates, campaigns] = await Promise.all([
    prisma.emailTemplate.findMany({ include: { campaign: true }, orderBy: { updatedAt: "desc" } }),
    prisma.campaign.findMany({ orderBy: { name: "asc" } })
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">Email Builder</h2>
        <p className="mt-1 text-sm text-neutral-600">Create reviewed templates with required unsubscribe and business-address merge tags.</p>
      </div>
      <Card>
        <CardHeader><h3 className="text-lg font-semibold">New Template</h3></CardHeader>
        <form action={saveEmailTemplateAction} className="grid gap-3 md:grid-cols-4">
          <Input name="name" placeholder="Template name" required />
          <select name="campaignId" className="min-h-10 rounded-md border border-black/10 bg-white px-3 py-2 text-sm">
            <option value="">No campaign</option>
            {campaigns.map((campaign) => <option key={campaign.id} value={campaign.id}>{campaign.name}</option>)}
          </select>
          <Input name="stepNumber" type="number" min="1" placeholder="Step" />
          <Input name="subject" placeholder="Subject" required />
          <Textarea name="body" className="md:col-span-4" placeholder="Hi {{firstName}}, ..." required />
          <Button>Save template</Button>
        </form>
      </Card>
      <TableWrap>
        <Table className="min-w-[1100px]">
          <thead className="bg-neutral-50 text-xs uppercase text-neutral-500">
            <tr><th className="px-3 py-3">Template</th><th className="px-3 py-3">Campaign</th><th className="px-3 py-3">Subject</th><th className="px-3 py-3">Body</th><th className="px-3 py-3">Action</th></tr>
          </thead>
          <tbody className="divide-y divide-black/10">
            {templates.map((template) => (
              <tr key={template.id} className="align-top">
                <td className="px-3 py-3 font-medium">{template.name}<div className="text-xs text-neutral-500">Step {template.stepNumber ?? "n/a"}</div></td>
                <td className="px-3 py-3">{template.campaign?.name ?? "Reusable"}</td>
                <td className="max-w-[260px] px-3 py-3">{template.subject}</td>
                <td className="max-w-[420px] px-3 py-3 text-sm text-neutral-600">{template.body.slice(0, 240)}</td>
                <td className="px-3 py-3"><form action={deleteEmailTemplateAction}><input type="hidden" name="id" value={template.id} /><Button variant="ghost">Delete</Button></form></td>
              </tr>
            ))}
          </tbody>
        </Table>
      </TableWrap>
    </div>
  );
}
