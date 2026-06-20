"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { writeAudit } from "@/lib/audit";
import { scoreLead } from "@/lib/ai/aiLeadScoringService";

function selectedIds(formData: FormData) {
  return formData.getAll("leadIds").filter((id): id is string => typeof id === "string" && Boolean(id));
}

async function scoreLeadById(id: string) {
  const lead = await prisma.lead.findUnique({ where: { id } });
  if (!lead) return;
  const result = await scoreLead(lead);
  await prisma.leadScore.upsert({
    where: { leadId: id },
    update: {
      score: result.score,
      qualityLabel: result.qualityLabel,
      reasonForScore: result.reasonForScore,
      personalisationFirstLine: result.personalisationFirstLine,
      suggestedPainPoint: result.suggestedPainPoint,
      suggestedOfferAngle: result.suggestedOfferAngle,
      suggestedSubjectLine: result.suggestedSubjectLine,
      suggestedFirstEmail: result.suggestedFirstEmail,
      recommendedCampaign: result.recommendedCampaign,
      complianceRiskNotes: result.complianceRiskNotes
    },
    create: {
      leadId: id,
      score: result.score,
      qualityLabel: result.qualityLabel,
      reasonForScore: result.reasonForScore,
      personalisationFirstLine: result.personalisationFirstLine,
      suggestedPainPoint: result.suggestedPainPoint,
      suggestedOfferAngle: result.suggestedOfferAngle,
      suggestedSubjectLine: result.suggestedSubjectLine,
      suggestedFirstEmail: result.suggestedFirstEmail,
      recommendedCampaign: result.recommendedCampaign,
      complianceRiskNotes: result.complianceRiskNotes
    }
  });
  await prisma.lead.update({ where: { id }, data: { status: "Scored", personalisationNote: result.personalisationFirstLine } });
  await writeAudit("Lead scored", "LeadScore", id, "AI lead scoring completed", result);
}

export async function scoreSingleLead(formData: FormData) {
  const id = formData.get("leadId");
  if (typeof id === "string") await scoreLeadById(id);
  revalidatePath("/ai-lead-scoring");
  revalidatePath("/leads");
}

export async function scoreSelectedLeads(formData: FormData) {
  for (const id of selectedIds(formData)) {
    await scoreLeadById(id);
  }
  revalidatePath("/ai-lead-scoring");
  revalidatePath("/leads");
}

export async function scoreAllUnscoredLeads() {
  const leads = await prisma.lead.findMany({ where: { leadScore: null }, select: { id: true } });
  for (const lead of leads) {
    await scoreLeadById(lead.id);
  }
  revalidatePath("/ai-lead-scoring");
  revalidatePath("/leads");
}

export async function overrideLeadScore(formData: FormData) {
  const leadId = formData.get("leadId");
  const score = Number.parseInt(String(formData.get("score") ?? ""), 10);
  const qualityLabel = String(formData.get("qualityLabel") ?? "Maybe");
  const reason = String(formData.get("reason") ?? "Manual override");
  if (typeof leadId !== "string" || !Number.isFinite(score)) return;

  await prisma.leadScore.upsert({
    where: { leadId },
    update: { score, qualityLabel, reasonForScore: reason },
    create: { leadId, score, qualityLabel, reasonForScore: reason }
  });
  await prisma.lead.update({ where: { id: leadId }, data: { status: "Scored" } });
  await writeAudit("Score override applied", "LeadScore", leadId, "Manual score override", { score, qualityLabel, reason });
  revalidatePath("/ai-lead-scoring");
  revalidatePath("/leads");
}
