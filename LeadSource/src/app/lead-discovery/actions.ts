"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { writeAudit } from "@/lib/audit";
import { runLeadDiscovery, DiscoveryPreview } from "@/lib/lead-discovery/discoveryService";
import { DiscoveryCriteria } from "@/lib/lead-discovery/types";
import { checkLeadDuplicate } from "@/lib/lead-discovery/leadDeduplicationService";
import { checkDiscoverySuppression } from "@/lib/lead-discovery/leadSourceComplianceService";
import { scoreLead } from "@/lib/ai/aiLeadScoringService";
import { initialDiscoverySummary, type DiscoveryState } from "./state";

function text(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function integer(formData: FormData, key: string, fallback: number) {
  const raw = text(formData, key);
  const parsed = raw ? Number.parseInt(raw, 10) : fallback;
  return Number.isFinite(parsed) ? parsed : fallback;
}

export async function createDiscoveryRun(_prev: DiscoveryState, formData: FormData): Promise<DiscoveryState> {
  const criteria: DiscoveryCriteria = {
    country: text(formData, "country") ?? "United Kingdom",
    city: text(formData, "city"),
    regionState: text(formData, "regionState"),
    industry: text(formData, "industry") ?? "Real Estate",
    niche: text(formData, "niche"),
    keywords: text(formData, "keywords"),
    keyword: text(formData, "keyword") ?? text(formData, "keywords"),
    companyType: text(formData, "companyType"),
    maxLeads: integer(formData, "maxLeads", 10),
    minLeadScore: integer(formData, "minLeadScore", 70)
  };

  const discovery = await runLeadDiscovery(criteria);
  return {
    runId: discovery.runId,
    provider: discovery.provider,
    results: discovery.results,
    summary: {
      ...initialDiscoverySummary,
      totalFound: discovery.results.length,
      approved: discovery.results.filter((lead) => lead.approved).length,
      duplicatesSkipped: discovery.results.filter((lead) => lead.duplicate).length,
      suppressedSkipped: discovery.results.filter((lead) => lead.suppressed).length,
      missingEmail: discovery.results.filter((lead) => lead.missingEmail).length,
      errors: 0
    },
    message: "Discovery preview ready. Approve the leads you want to add."
  };
}

export async function saveApprovedDiscoveryLeads(_prev: DiscoveryState, formData: FormData): Promise<DiscoveryState> {
  const runId = text(formData, "runId");
  const rawResults = formData.get("results");
  const results: DiscoveryPreview[] = typeof rawResults === "string" ? JSON.parse(rawResults) : [];
  const approved = results.filter((lead) => lead.approved && !lead.rejected && !lead.duplicate && !lead.suppressed);
  const rejected = results.filter((lead) => lead.rejected);
  const scoreAfterSave = formData.get("scoreAfterSave") === "true";

  const source = await prisma.leadSource.upsert({
    where: { id: "lead-discovery" },
    update: {},
    create: {
      id: "lead-discovery",
      name: "Lead Discovery",
      type: "Discovery",
      provider: "Mock/API Provider",
      description: "Leads created from the Lead Discovery engine."
    }
  });

  let added = 0;
  let duplicatesSkipped = 0;
  let suppressedSkipped = 0;
  const seen = new Set<string>();

  for (const lead of approved) {
    const email = lead.email?.toLowerCase();
    const duplicateCheck = await checkLeadDuplicate(lead, seen);
    if (duplicateCheck.duplicate) {
      duplicatesSkipped += 1;
      await writeAudit("Duplicate skipped", "LeadDiscoveryRun", runId, "Duplicate skipped while saving discovery lead", { email, website: lead.website, reason: duplicateCheck.duplicateReason });
      continue;
    }
    const suppressionCheck = await checkDiscoverySuppression(lead);
    if (suppressionCheck.suppressed) {
      suppressedSkipped += 1;
      await writeAudit("Suppressed skipped", "LeadDiscoveryRun", runId, "Suppressed email skipped while saving discovery lead", { email, reason: suppressionCheck.suppressionReason });
      continue;
    }

    const created = await prisma.lead.create({
      data: {
        firstName: lead.firstName,
        lastName: lead.lastName,
        fullName: lead.fullName,
        email,
        phone: lead.phone,
        companyName: lead.companyName,
        website: lead.website,
        location: lead.location,
        city: lead.city,
        stateRegion: lead.stateRegion,
        country: lead.country,
        industry: lead.industry,
        niche: lead.niche,
        sourceUrl: lead.sourceUrl,
        contactPageUrl: lead.contactPageUrl,
        sourcePlatform: lead.sourcePlatform,
        discoveryQuery: lead.discoveryQuery,
        confidenceScore: lead.confidenceScore,
        googlePlaceId: lead.googlePlaceId,
        googleRating: lead.googleRating,
        googleReviewsCount: lead.googleReviewsCount,
        personalisationNote: lead.personalisationNote,
        contactType: lead.contactType,
        notes: lead.leadSourceNotes,
        status: "Discovered",
        leadSourceId: source.id,
        discoveryRunId: runId,
        emailVerification: email ? { create: { status: "Not Checked", provider: "local" } } : undefined,
        complianceCheck: {
          create: {
            status: "Pending Review",
            countryProfile: lead.country,
            sourceUrlPresent: Boolean(lead.sourceUrl)
          }
        }
      }
    });
    added += 1;
    if (scoreAfterSave) {
      const result = await scoreLead(created);
      await prisma.leadScore.create({
        data: {
          leadId: created.id,
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
      await prisma.lead.update({ where: { id: created.id }, data: { status: "Scored" } });
      await writeAudit("Lead sent to AI scoring from discovery", "Lead", created.id, "Discovery lead scored after approval", { email });
    }
    await writeAudit("Lead approved from discovery", "Lead", created.id, "Approved discovery lead added to Leads", { email });
  }

  for (const lead of rejected) {
    await writeAudit("Lead rejected from discovery", "LeadDiscoveryRun", runId, "Discovery preview lead rejected", { email: lead.email });
  }

  if (runId) {
    await prisma.leadDiscoveryRun.update({
      where: { id: runId },
      data: { status: "Completed", leadsFound: results.length }
    });
  }

  revalidatePath("/lead-discovery");
  revalidatePath("/leads");
  return {
    runId,
    results,
    summary: {
      totalFound: results.length,
      added,
      approved: approved.length,
      duplicatesSkipped: results.filter((lead) => lead.duplicate).length + duplicatesSkipped,
      suppressedSkipped: results.filter((lead) => lead.suppressed).length + suppressedSkipped,
      missingEmail: results.filter((lead) => lead.missingEmail).length,
      errors: 0,
      rejected: rejected.length
    },
    message: `${added} approved leads added to Leads.`
  };
}
