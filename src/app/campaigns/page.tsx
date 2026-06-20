import { AlertTriangle } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { Card, CardHeader } from "@/components/ui/card";
import { Table, TableWrap } from "@/components/ui/table";
import { getAllCampaignBounceRates } from "@/lib/domain-guard/bounceRateGuard";
import { getAllCampaignUnsubscribeRates } from "@/lib/domain-guard/unsubscribeRateGuard";
import { getDomainRiskSummary } from "@/lib/domain-guard/domainReputationGuard";
import { formatDate } from "@/lib/lead-utils";

export const dynamic = "force-dynamic";

function percent(value: number) {
  return `${(value * 100).toFixed(1)}%`;
}

export default async function CampaignsPage() {
  const [campaigns, bounceRates, unsubscribeRates, risk] = await Promise.all([
    prisma.campaign.findMany({
      include: {
        enrollments: true,
        steps: true,
        queueItems: true
      },
      orderBy: { updatedAt: "desc" }
    }),
    getAllCampaignBounceRates(),
    getAllCampaignUnsubscribeRates(),
    getDomainRiskSummary()
  ]);
  const bounceByCampaign = new Map(bounceRates.map((rate) => [rate.campaignId, rate]));
  const unsubscribeByCampaign = new Map(unsubscribeRates.map((rate) => [rate.campaignId, rate]));
  const pausedByDomainGuard = campaigns.filter((campaign) => campaign.pausedBy === "Domain Guard");

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 xl:flex-row xl:items-center">
        <div>
          <h2 className="text-2xl font-semibold">Campaigns</h2>
          <p className="mt-1 text-sm text-neutral-600">Campaign review with Domain Guard risk protection.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge tone={risk.warnings.length ? "red" : "green"}>{risk.warnings.length} risk warnings</Badge>
          <Badge tone={pausedByDomainGuard.length ? "red" : "black"}>{pausedByDomainGuard.length} paused by Domain Guard</Badge>
        </div>
      </div>

      {risk.warnings.length > 0 && (
        <Card className="border-red-200 bg-red-50 text-sm leading-6 text-red-800">
          <div className="flex items-center gap-2 font-semibold"><AlertTriangle className="h-4 w-4" /> Domain Guard warnings</div>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            {risk.warnings.map((warning) => <li key={warning}>{warning}</li>)}
          </ul>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-4">
        <Card className="p-4"><div className="text-xs text-neutral-500">Campaigns</div><div className="mt-1 text-2xl font-semibold">{campaigns.length}</div></Card>
        <Card className="p-4"><div className="text-xs text-neutral-500">Paused by Domain Guard</div><div className="mt-1 text-2xl font-semibold">{pausedByDomainGuard.length}</div></Card>
        <Card className="p-4"><div className="text-xs text-neutral-500">Aggregate bounce rate</div><div className="mt-1 text-2xl font-semibold">{percent(risk.aggregateBounceRate)}</div></Card>
        <Card className="p-4"><div className="text-xs text-neutral-500">Aggregate unsubscribe rate</div><div className="mt-1 text-2xl font-semibold">{percent(risk.aggregateUnsubscribeRate)}</div></Card>
      </div>

      <Card>
        <CardHeader>
          <div>
            <h3 className="text-lg font-semibold">Campaign Protection</h3>
            <p className="text-sm text-neutral-600">Campaigns pause automatically when bounce or unsubscribe rates exceed Domain Guard thresholds.</p>
          </div>
        </CardHeader>
        <TableWrap>
          <Table className="min-w-[1300px]">
            <thead className="bg-neutral-50 text-xs uppercase text-neutral-500">
              <tr>
                <th className="px-3 py-3">Campaign</th>
                <th className="px-3 py-3">Mode</th>
                <th className="px-3 py-3">Paused by</th>
                <th className="px-3 py-3">Pause reason</th>
                <th className="px-3 py-3">Bounce rate</th>
                <th className="px-3 py-3">Unsubscribe rate</th>
                <th className="px-3 py-3">Enrollments</th>
                <th className="px-3 py-3">Queue items</th>
                <th className="px-3 py-3">Updated</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/10">
              {campaigns.map((campaign) => {
                const bounce = bounceByCampaign.get(campaign.id);
                const unsubscribe = unsubscribeByCampaign.get(campaign.id);
                return (
                  <tr key={campaign.id} className="align-top">
                    <td className="px-3 py-3">
                      <div className="font-medium">{campaign.name}</div>
                      <div className="text-xs text-neutral-500">{campaign.targetCountry ?? "No target country"}</div>
                    </td>
                    <td className="px-3 py-3"><StatusBadge status={campaign.mode} /></td>
                    <td className="px-3 py-3">{campaign.pausedBy ?? "None"}</td>
                    <td className="max-w-[320px] px-3 py-3 text-sm text-red-700">{campaign.pauseReason ?? "None"}</td>
                    <td className="px-3 py-3">{percent(bounce?.bounceRate ?? 0)}<div className="text-xs text-neutral-500">{bounce?.bouncedCount ?? 0}/{bounce?.sentCount ?? 0}</div></td>
                    <td className="px-3 py-3">{percent(unsubscribe?.unsubscribeRate ?? 0)}<div className="text-xs text-neutral-500">{unsubscribe?.unsubscribedCount ?? 0}/{unsubscribe?.sentCount ?? 0}</div></td>
                    <td className="px-3 py-3">{campaign.enrollments.length}</td>
                    <td className="px-3 py-3">{campaign.queueItems.length}</td>
                    <td className="px-3 py-3">{formatDate(campaign.updatedAt)}</td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        </TableWrap>
      </Card>
    </div>
  );
}
