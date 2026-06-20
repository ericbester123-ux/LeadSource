"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { writeAudit } from "@/lib/audit";
import { scoreLead } from "@/lib/ai/aiLeadScoringService";
import { AiScoreResult } from "@/lib/ai/localAiPlaceholder";
import { generatePersonalisationWithProvider, generateSuggestedEmailWithProvider } from "@/lib/ai/aiProviderFactory";

function selectedIds(formData: FormData) {
  return formData.getAll("leadIds").filter((id): id is string => typeof id === "string" && Boolean(id));
}

function safeScore(score: number) {
  return Math.max(1, Math.min(100, score));
}

function safeRevalidate(...paths: string[]) {
  for (const path of paths) {
    try {
      revalidatePath(path);
    } catch {
      // Direct smoke scripts do not have Next's static generation store.
    }
  }
}

async function saveAiResult(id: string, result: AiScoreResult) {
  const score = safeScore(result.score);
  const lead = await prisma.lead.findUnique({ where: { id } });
  if (!lead) return;
  await prisma.leadScore.upsert({
    where: { leadId: id },
    update: {
      score,
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
      score,
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
}

async function scoreLeadById(id: string) {
  const lead = await prisma.lead.findUnique({ where: { id } });
  if (!lead) return;
  await writeAudit("AI scoring started", "Lead", id, "AI scoring started", { companyName: lead.companyName });
  try {
    const result = await scoreLead(lead);
    await saveAiResult(id, result);
    if (result.fallbackReason) {
      await writeAudit("AI fallback used", "Lead", id, result.fallbackReason, { providerUsed: result.providerUsed });
    }
    await writeAudit("Personalisation generated", "Lead", id, "Personalisation first line generated during AI scoring", {
      providerUsed: result.providerUsed ?? "unknown"
    });
    await writeAudit("Suggested email generated", "Lead", id, "Suggested first email generated during AI scoring", {
      providerUsed: result.providerUsed ?? "unknown"
    });
    await writeAudit("AI scoring completed", "LeadScore", id, "AI lead scoring completed", {
      score: result.score,
      qualityLabel: result.qualityLabel,
      providerUsed: result.providerUsed ?? "unknown",
      fallbackReason: result.fallbackReason
    });
  } catch (error) {
    const reason = error instanceof Error ? error.message : "AI scoring failed.";
    await writeAudit("AI scoring failed", "Lead", id, reason, { companyName: lead.companyName });
  }
}

export async function previewAiOutput(formData: FormData) {
  const id = formData.get("leadId");
  if (typeof id !== "string") return null;
  const lead = await prisma.lead.findUnique({ where: { id } });
  if (!lead) return null;
  await writeAudit("AI scoring started", "Lead", id, "AI scoring preview started", { companyName: lead.companyName, previewOnly: true });
  try {
    const result = await scoreLead(lead);
    if (result.fallbackReason) {
      await writeAudit("AI fallback used", "Lead", id, result.fallbackReason, { providerUsed: result.providerUsed, previewOnly: true });
    }
    await writeAudit("AI scoring completed", "Lead", id, "AI scoring preview generated", {
      score: result.score,
      qualityLabel: result.qualityLabel,
      providerUsed: result.providerUsed ?? "unknown",
      previewOnly: true
    });
    return { leadId: id, companyName: lead.companyName, ...result };
  } catch (error) {
    const reason = error instanceof Error ? error.message : "AI scoring failed.";
    await writeAudit("AI scoring failed", "Lead", id, reason, { previewOnly: true });
    return { leadId: id, companyName: lead.companyName, error: reason };
  }
}

export async function savePreviewedAiOutput(formData: FormData) {
  const leadId = String(formData.get("leadId") ?? "");
  if (!leadId) return;
  const result: AiScoreResult = {
    score: Number(formData.get("score") ?? 50),
    qualityLabel: String(formData.get("qualityLabel") ?? "Maybe"),
    reasonForScore: String(formData.get("reasonForScore") ?? ""),
    personalisationFirstLine: String(formData.get("personalisationFirstLine") ?? ""),
    suggestedPainPoint: String(formData.get("suggestedPainPoint") ?? ""),
    suggestedOfferAngle: String(formData.get("suggestedOfferAngle") ?? ""),
    suggestedSubjectLine: String(formData.get("suggestedSubjectLine") ?? ""),
    suggestedFirstEmail: String(formData.get("suggestedFirstEmail") ?? ""),
    recommendedCampaign: String(formData.get("recommendedCampaign") ?? ""),
    complianceRiskNotes: String(formData.get("complianceRiskNotes") ?? ""),
    providerUsed: String(formData.get("providerUsed") ?? "unknown"),
    fallbackReason: String(formData.get("fallbackReason") ?? "") || undefined
  };
  await saveAiResult(leadId, result);
  await writeAudit("AI scoring completed", "LeadScore", leadId, "Previewed AI output saved to lead score", {
    score: result.score,
    qualityLabel: result.qualityLabel,
    providerUsed: result.providerUsed ?? "unknown"
  });
  safeRevalidate("/ai-lead-scoring", "/leads");
}

export async function scoreSingleLead(formData: FormData) {
  const id = formData.get("leadId");
  if (typeof id === "string") await scoreLeadById(id);
  safeRevalidate("/ai-lead-scoring", "/leads");
}

export async function scoreSelectedLeads(formData: FormData) {
  for (const id of selectedIds(formData)) {
    await scoreLeadById(id);
  }
  safeRevalidate("/ai-lead-scoring", "/leads");
}

export async function regeneratePersonalisationSelected(formData: FormData) {
  for (const id of selectedIds(formData)) {
    const lead = await prisma.lead.findUnique({ where: { id } });
    if (!lead) continue;
    try {
      const personalisationFirstLine = await generatePersonalisationWithProvider(lead);
      await prisma.lead.update({ where: { id }, data: { personalisationNote: personalisationFirstLine } });
      await prisma.leadScore.upsert({
        where: { leadId: id },
        update: { personalisationFirstLine },
        create: {
          leadId: id,
          score: 50,
          qualityLabel: "Maybe",
          reasonForScore: "Personalisation generated before full score.",
          personalisationFirstLine
        }
      });
      await writeAudit("Personalisation generated", "Lead", id, "Personalisation regenerated for selected lead", {});
    } catch (error) {
      await writeAudit("AI scoring failed", "Lead", id, error instanceof Error ? error.message : "Personalisation generation failed.", {});
    }
  }
  safeRevalidate("/ai-lead-scoring", "/leads");
}

export async function generateSuggestedEmailSelected(formData: FormData) {
  for (const id of selectedIds(formData)) {
    const lead = await prisma.lead.findUnique({ where: { id }, include: { leadScore: true } });
    if (!lead) continue;
    try {
      const suggestedFirstEmail = await generateSuggestedEmailWithProvider(lead);
      await prisma.leadScore.upsert({
        where: { leadId: id },
        update: { suggestedFirstEmail },
        create: {
          leadId: id,
          score: 50,
          qualityLabel: "Maybe",
          reasonForScore: "Suggested email generated before full score.",
          suggestedFirstEmail
        }
      });
      await writeAudit("Suggested email generated", "Lead", id, "Suggested first email generated for selected lead", {});
    } catch (error) {
      await writeAudit("AI scoring failed", "Lead", id, error instanceof Error ? error.message : "Suggested email generation failed.", {});
    }
  }
  safeRevalidate("/ai-lead-scoring", "/leads");
}

export async function scoreAllUnscoredLeads() {
  const leads = await prisma.lead.findMany({ where: { leadScore: null }, select: { id: true } });
  for (const lead of leads) {
    await scoreLeadById(lead.id);
  }
  safeRevalidate("/ai-lead-scoring", "/leads");
}

export async function overrideLeadScore(formData: FormData) {
  const leadId = formData.get("leadId");
  const score = Number.parseInt(String(formData.get("score") ?? ""), 10);
  const qualityLabel = String(formData.get("qualityLabel") ?? "Maybe");
  const reason = String(formData.get("reason") ?? "").trim();
  if (typeof leadId !== "string" || !Number.isFinite(score) || !reason) return;

  await prisma.leadScore.upsert({
    where: { leadId },
    update: { score: safeScore(score), qualityLabel, reasonForScore: reason },
    create: { leadId, score: safeScore(score), qualityLabel, reasonForScore: reason }
  });
  await prisma.lead.update({ where: { id: leadId }, data: { status: "Scored" } });
  await writeAudit("AI score manually overridden", "LeadScore", leadId, "Manual score override", { score: safeScore(score), qualityLabel, reason });
  safeRevalidate("/ai-lead-scoring", "/leads");
}
