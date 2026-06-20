import { prisma } from "@/lib/prisma";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { Input, Textarea } from "@/components/ui/input";
import { Table, TableWrap } from "@/components/ui/table";
import { addCampaignStepAction, createCampaignAction, pauseCampaignAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function CampaignBuilderPage() {
  const campaigns = await prisma.campaign.findMany({ include: { steps: { orderBy: { stepNumber: "asc" } }, enrollments: true }, orderBy: { updatedAt: "desc" } });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">Campaign Builder</h2>
        <p className="mt-1 text-sm text-neutral-600">Build reviewed campaigns, sequence steps, and daily sending limits before queue generation.</p>
      </div>

      <Card>
        <CardHeader><h3 className="text-lg font-semibold">Create Campaign</h3></CardHeader>
        <form action={createCampaignAction} className="grid gap-3 md:grid-cols-3">
          <Input name="name" placeholder="Campaign name" required />
          <Input name="targetCountry" placeholder="Target country" />
          <Input name="targetIndustry" placeholder="Industry" />
          <Input name="targetNiche" placeholder="Niche" />
          <Input name="offer" placeholder="Offer angle" />
          <Input name="minimumLeadScore" type="number" min="1" max="100" defaultValue="75" />
          <Input name="maxEmailsSentPerDay" type="number" min="1" max="50" defaultValue="20" />
          <label className="flex items-center gap-2 text-sm"><input name="requireManualApprovalBeforeSend" type="checkbox" defaultChecked /> Manual approval before send</label>
          <Button>Create campaign</Button>
        </form>
      </Card>

      <Card>
        <CardHeader><h3 className="text-lg font-semibold">Add Sequence Step</h3></CardHeader>
        <form action={addCampaignStepAction} className="grid gap-3 md:grid-cols-4">
          <select name="campaignId" className="min-h-10 rounded-md border border-black/10 bg-white px-3 py-2 text-sm" required>
            <option value="">Choose campaign</option>
            {campaigns.map((campaign) => <option key={campaign.id} value={campaign.id}>{campaign.name}</option>)}
          </select>
          <Input name="stepNumber" type="number" min="1" defaultValue="1" />
          <Input name="delayDays" type="number" min="0" defaultValue="0" />
          <Input name="name" placeholder="Step name" />
          <Input name="subject" placeholder="Subject" required />
          <Textarea name="body" placeholder="Email body with merge tags" className="md:col-span-3" required />
          <Button>Add step</Button>
        </form>
      </Card>

      <TableWrap>
        <Table className="min-w-[1200px]">
          <thead className="bg-neutral-50 text-xs uppercase text-neutral-500">
            <tr><th className="px-3 py-3">Campaign</th><th className="px-3 py-3">Mode</th><th className="px-3 py-3">Target</th><th className="px-3 py-3">Steps</th><th className="px-3 py-3">Enrollments</th><th className="px-3 py-3">Pause</th></tr>
          </thead>
          <tbody className="divide-y divide-black/10">
            {campaigns.map((campaign) => (
              <tr key={campaign.id} className="align-top">
                <td className="px-3 py-3"><div className="font-medium">{campaign.name}</div><div className="text-xs text-neutral-500">{campaign.offer}</div></td>
                <td className="px-3 py-3"><StatusBadge status={campaign.mode} /></td>
                <td className="px-3 py-3">{campaign.targetCountry ?? "Any"}<div className="text-xs text-neutral-500">{campaign.targetIndustry} {campaign.targetNiche}</div></td>
                <td className="px-3 py-3"><Badge tone="black">{campaign.steps.length} steps</Badge><div className="mt-2 space-y-1 text-xs text-neutral-600">{campaign.steps.map((step) => <div key={step.id}>{step.stepNumber}. {step.subject}</div>)}</div></td>
                <td className="px-3 py-3">{campaign.enrollments.length}</td>
                <td className="px-3 py-3">
                  <form action={pauseCampaignAction} className="grid min-w-[240px] gap-2">
                    <input type="hidden" name="campaignId" value={campaign.id} />
                    <Input name="reason" placeholder="Pause reason" />
                    <Button variant="ghost">Pause</Button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      </TableWrap>
    </div>
  );
}
