import { Campaign } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { writeAudit } from "@/lib/audit";

export type CampaignRate = {
  campaignId: string;
  campaignName: string;
  mode: string;
  pauseReason?: string | null;
  pausedBy?: string | null;
  sentCount: number;
  bouncedCount: number;
  bounceRate: number;
};

export async function getCampaignBounceRate(campaign: Campaign): Promise<CampaignRate> {
  const logs = await prisma.emailSendLog.findMany({
    where: { campaignId: campaign.id, status: { in: ["Simulated", "Sent", "Failed"] } },
    include: { lead: true }
  });
  const sentCount = logs.length;
  const bouncedLeadIds = new Set(logs.filter((log) => log.lead.bounced || log.status === "Failed").map((log) => log.leadId));
  const bouncedCount = bouncedLeadIds.size;
  const bounceRate = sentCount ? bouncedCount / sentCount : 0;

  return {
    campaignId: campaign.id,
    campaignName: campaign.name,
    mode: campaign.mode,
    pauseReason: campaign.pauseReason,
    pausedBy: campaign.pausedBy,
    sentCount,
    bouncedCount,
    bounceRate
  };
}

export async function getAllCampaignBounceRates() {
  const campaigns = await prisma.campaign.findMany({ orderBy: { name: "asc" } });
  return Promise.all(campaigns.map(getCampaignBounceRate));
}

export async function pauseCampaignForBounceThreshold(campaignId: string, rate: number, threshold: number) {
  const reason = `Bounce rate ${(rate * 100).toFixed(1)}% exceeds threshold ${(threshold * 100).toFixed(1)}%.`;
  const campaign = await prisma.campaign.update({
    where: { id: campaignId },
    data: {
      mode: "Paused",
      pauseReason: reason,
      pausedBy: "Domain Guard",
      pausedAt: new Date()
    }
  });
  await writeAudit("Campaign paused due to bounce threshold", "Campaign", campaignId, reason, { rate, threshold });
  return campaign;
}
