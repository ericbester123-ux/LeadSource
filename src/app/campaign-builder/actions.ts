"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { writeAudit } from "@/lib/audit";

function value(formData: FormData, key: string) {
  const raw = formData.get(key);
  return typeof raw === "string" && raw.trim() ? raw.trim() : undefined;
}

function intValue(formData: FormData, key: string, fallback: number) {
  const parsed = Number.parseInt(value(formData, key) ?? "", 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export async function createCampaignAction(formData: FormData) {
  const name = value(formData, "name");
  if (!name) return;
  const campaign = await prisma.campaign.create({
    data: {
      name,
      targetCountry: value(formData, "targetCountry"),
      targetIndustry: value(formData, "targetIndustry"),
      targetNiche: value(formData, "targetNiche"),
      offer: value(formData, "offer"),
      minimumLeadScore: intValue(formData, "minimumLeadScore", 75),
      maxEmailsSentPerDay: intValue(formData, "maxEmailsSentPerDay", 20),
      requireManualApprovalBeforeSend: formData.get("requireManualApprovalBeforeSend") === "on",
      mode: "Review Required"
    }
  });
  await writeAudit("Campaign created", "Campaign", campaign.id, "Campaign Builder created a campaign", { name });
  revalidatePath("/campaign-builder");
  revalidatePath("/campaigns");
}

export async function addCampaignStepAction(formData: FormData) {
  const campaignId = value(formData, "campaignId");
  const subject = value(formData, "subject");
  const body = value(formData, "body");
  if (!campaignId || !subject || !body) return;
  const step = await prisma.campaignStep.create({
    data: {
      campaignId,
      stepNumber: intValue(formData, "stepNumber", 1),
      name: value(formData, "name") ?? `Step ${intValue(formData, "stepNumber", 1)}`,
      delayDays: intValue(formData, "delayDays", 0),
      subject,
      body
    }
  });
  await writeAudit("Campaign step added", "CampaignStep", step.id, "Campaign Builder added a sequence step", { campaignId });
  revalidatePath("/campaign-builder");
}

export async function pauseCampaignAction(formData: FormData) {
  const id = value(formData, "campaignId");
  const reason = value(formData, "reason") ?? "Manual pause";
  if (!id) return;
  await prisma.campaign.update({ where: { id }, data: { mode: "Paused", pausedBy: "Manual Review", pauseReason: reason, pausedAt: new Date() } });
  await writeAudit("Campaign paused", "Campaign", id, reason);
  revalidatePath("/campaign-builder");
  revalidatePath("/campaigns");
}
