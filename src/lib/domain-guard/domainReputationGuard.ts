import { prisma } from "@/lib/prisma";
import { getChecklistSummary } from "./domainChecklistService";
import { getAllCampaignBounceRates, pauseCampaignForBounceThreshold } from "./bounceRateGuard";
import { getAllCampaignUnsubscribeRates, pauseCampaignForUnsubscribeThreshold } from "./unsubscribeRateGuard";

export const defaultDomainGuardId = "default-domain-guard";

export async function getOrCreateDomainGuard() {
  return prisma.domainReputationCheck.upsert({
    where: { id: defaultDomainGuardId },
    update: {},
    create: {
      id: defaultDomainGuardId,
      sendingDomain: "estateselevate.com",
      dailyLimitPerInbox: 20,
      sendingDays: "Monday-Friday",
      sendingWindowStart: "09:00",
      sendingWindowEnd: "15:30",
      warmupMode: true,
      simulationMode: process.env.SIMULATE_EMAIL_SENDING !== "false",
      liveSendingAllowed: false,
      lastGateBlockReason: "Live sending has not been enabled.",
      unsubscribeThreshold: 0.03,
      complaintThreshold: 0.01,
      status: "Needs Review"
    }
  });
}

export async function getDomainGuardSummary() {
  const guard = await getOrCreateDomainGuard();
  const summary = getChecklistSummary(guard);
  return { guard, summary };
}

export async function getDomainRiskSummary() {
  const guard = await getOrCreateDomainGuard();
  const [bounceRates, unsubscribeRates, pausedCount] = await Promise.all([
    getAllCampaignBounceRates(),
    getAllCampaignUnsubscribeRates(),
    prisma.campaign.count({ where: { pausedBy: "Domain Guard" } })
  ]);

  const bounceWarnings = bounceRates
    .filter((rate) => rate.sentCount > 0 && rate.bounceRate > guard.bounceThreshold)
    .map((rate) => `${rate.campaignName}: bounce rate ${(rate.bounceRate * 100).toFixed(1)}% exceeds ${(guard.bounceThreshold * 100).toFixed(1)}%.`);
  const unsubscribeWarnings = unsubscribeRates
    .filter((rate) => rate.sentCount > 0 && rate.unsubscribeRate > guard.unsubscribeThreshold)
    .map((rate) => `${rate.campaignName}: unsubscribe rate ${(rate.unsubscribeRate * 100).toFixed(1)}% exceeds ${(guard.unsubscribeThreshold * 100).toFixed(1)}%.`);

  return {
    guard,
    bounceRates,
    unsubscribeRates,
    warnings: [...bounceWarnings, ...unsubscribeWarnings],
    pausedByDomainGuardCount: pausedCount,
    aggregateBounceRate: aggregateRate(bounceRates, "bouncedCount"),
    aggregateUnsubscribeRate: aggregateRate(unsubscribeRates, "unsubscribedCount")
  };
}

function aggregateRate<T extends { sentCount: number }>(rates: T[], numeratorKey: keyof T) {
  const sent = rates.reduce((sum, rate) => sum + rate.sentCount, 0);
  const count = rates.reduce((sum, rate) => sum + Number(rate[numeratorKey] ?? 0), 0);
  return sent ? count / sent : 0;
}

export async function applyCampaignProtection() {
  const guard = await getOrCreateDomainGuard();
  const [bounceRates, unsubscribeRates] = await Promise.all([getAllCampaignBounceRates(), getAllCampaignUnsubscribeRates()]);
  const paused: string[] = [];

  for (const rate of bounceRates) {
    if (rate.sentCount > 0 && rate.bounceRate > guard.bounceThreshold && rate.pausedBy !== "Domain Guard") {
      await pauseCampaignForBounceThreshold(rate.campaignId, rate.bounceRate, guard.bounceThreshold);
      paused.push(rate.campaignId);
    }
  }

  for (const rate of unsubscribeRates) {
    if (rate.sentCount > 0 && rate.unsubscribeRate > guard.unsubscribeThreshold && rate.pausedBy !== "Domain Guard") {
      await pauseCampaignForUnsubscribeThreshold(rate.campaignId, rate.unsubscribeRate, guard.unsubscribeThreshold);
      paused.push(rate.campaignId);
    }
  }

  return paused;
}
