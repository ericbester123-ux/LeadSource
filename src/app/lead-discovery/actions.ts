"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { writeAudit } from "@/lib/audit";
import { runLeadDiscovery } from "@/lib/lead-discovery/discoveryService";
import type { DiscoveryPreview } from "@/lib/lead-discovery/discoveryService";
import type { DiscoveryCriteria } from "@/lib/lead-discovery/types";
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
      duplicatesSkipped: discovery.results.filter((lead) => lead.duplicate).length,
      suppressedSkipped: discovery.results.filter((lead) => lead.suppressed).length
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
  const existing = new Set((await prisma.lead.findMany({ select: { email: true, website: true } })).flatMap((lead) => [lead.email.toLowerCase(), lead.website?.toLowerCase() ?? ""]));
  const suppressed = new Set((await prisma.suppressionListEntry.findMany({ select: { email: true } })).map((entry) => entry.email.toLowerCase()));

  for (const lead of approved) {
    const email = lead.email.toLowerCase();
    const website = lead.website.toLowerCase();
    if (existing.has(email) || existing.has(website)) {
      duplicatesSkipped += 1;
      await writeAudit("Duplicate skipped", "LeadDiscoveryRun", runId, "Duplicate skipped while saving discovery lead", { email, website });
      continue;
    }
    if (suppressed.has(email)) {
      suppressedSkipped += 1;
      await writeAudit("Suppressed skipped", "LeadDiscoveryRun", runId, "Suppressed email skipped while saving discovery lead", { email });
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
        sourcePlatform: lead.sourcePlatform,
        discoveryQuery: lead.discoveryQuery,
        confidenceScore: lead.confidenceScore,
        personalisationNote: lead.personalisationNote,
        contactType: lead.contactType,
        status: "Discovered",
        leadSourceId: source.id,
        discoveryRunId: runId,
        emailVerification: { create: { status: "Not Checked", provider: "local" } },
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
    existing.add(email);
    existing.add(website);
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
      duplicatesSkipped: results.filter((lead) => lead.duplicate).length + duplicatesSkipped,
      suppressedSkipped: results.filter((lead) => lead.suppressed).length + suppressedSkipped,
      rejected: rejected.length
    },
    message: `${added} approved leads added to Leads.`
  };
}
