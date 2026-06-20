import { Campaign } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { writeAudit } from "@/lib/audit";

export type CampaignUnsubscribeRate = {
  campaignId: string;
  campaignName: string;
  mode: string;
  pauseReason?: string | null;
  pausedBy?: string | null;
  sentCount: number;
  unsubscribedCount: number;
  unsubscribeRate: number;
};

export async function getCampaignUnsubscribeRate(campaign: Campaign): Promise<CampaignUnsubscribeRate> {
  const logs = await prisma.emailSendLog.findMany({
    where: { campaignId: campaign.id, status: { in: ["Simulated", "Sent"] } },
    include: { lead: { include: { replies: true } } }
  });
  const sentCount = logs.length;
  const unsubscribedLeadIds = new Set(
    logs
      .filter((log) => log.lead.unsubscribed || log.lead.replies.some((reply) => reply.replyStatus === "Unsubscribe Request"))
      .map((log) => log.leadId)
  );
  const unsubscribedCount = unsubscribedLeadIds.size;
  const unsubscribeRate = sentCount ? unsubscribedCount / sentCount : 0;

  return {
    campaignId: campaign.id,
    campaignName: campaign.name,
    mode: campaign.mode,
    pauseReason: campaign.pauseReason,
    pausedBy: campaign.pausedBy,
    sentCount,
    unsubscribedCount,
    unsubscribeRate
  };
}

export async function getAllCampaignUnsubscribeRates() {
  const campaigns = await prisma.campaign.findMany({ orderBy: { name: "asc" } });
  return Promise.all(campaigns.map(getCampaignUnsubscribeRate));
}

export async function pauseCampaignForUnsubscribeThreshold(campaignId: string, rate: number, threshold: number) {
  const reason = `Unsubscribe rate ${(rate * 100).toFixed(1)}% exceeds threshold ${(threshold * 100).toFixed(1)}%.`;
  const campaign = await prisma.campaign.update({
    where: { id: campaignId },
    data: {
      mode: "Paused",
      pauseReason: reason,
      pausedBy: "Domain Guard",
      pausedAt: new Date()
    }
  });
  await writeAudit("Campaign paused due to unsubscribe threshold", "Campaign", campaignId, reason, { rate, threshold });
  return campaign;
}
