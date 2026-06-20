import { prisma } from "@/lib/prisma";
import { isValidEmail } from "@/lib/lead-utils";
import { writeAudit } from "@/lib/audit";
import { DiscoveryCriteria, DiscoveredLead } from "./types";
import { googlePlacesProvider } from "./providers/googlePlacesProvider";
import { websiteSearchProvider } from "./providers/websiteSearchProvider";

export type DiscoveryPreview = DiscoveredLead & {
  previewId: string;
  duplicate: boolean;
  suppressed: boolean;
  rejected?: boolean;
  approved?: boolean;
};

export async function runLeadDiscovery(criteria: DiscoveryCriteria) {
  const run = await prisma.leadDiscoveryRun.create({
    data: {
      query: [
        criteria.keywords,
        criteria.companyType,
        criteria.niche,
        criteria.industry,
        criteria.city,
        criteria.regionState,
        criteria.country
      ].filter(Boolean).join(" "),
      country: criteria.country,
      city: criteria.city,
      region: criteria.regionState,
      state: criteria.regionState,
      industry: criteria.industry,
      niche: criteria.niche,
      keywords: criteria.keywords,
      companyType: criteria.companyType,
      minLeadScore: criteria.minLeadScore,
      maxLeadsPerDay: criteria.maxLeads,
      provider: process.env.GOOGLE_PLACES_API_KEY || process.env.SERP_API_KEY ? "configured providers" : "mock",
      status: "Preview"
    }
  });

  await writeAudit("Discovery run started", "LeadDiscoveryRun", run.id, "Lead discovery preview created", criteria);

  const provider = process.env.GOOGLE_PLACES_API_KEY ? googlePlacesProvider : websiteSearchProvider;
  const discovered = (await provider.discover(criteria)).filter((lead) => isValidEmail(lead.email));
  const existingLeads = await prisma.lead.findMany({ select: { email: true, website: true } });
  const suppressed = await prisma.suppressionListEntry.findMany({ select: { email: true } });
  const existingEmails = new Set(existingLeads.map((lead) => lead.email.toLowerCase()));
  const existingWebsites = new Set(existingLeads.map((lead) => lead.website?.toLowerCase()).filter(Boolean));
  const suppressedEmails = new Set(suppressed.map((entry) => entry.email.toLowerCase()));

  const seenEmails = new Set<string>();
  const seenWebsites = new Set<string>();
  const preview = discovered.map<DiscoveryPreview>((lead, index) => {
    const email = lead.email.toLowerCase();
    const website = lead.website.toLowerCase();
    const duplicate = existingEmails.has(email) || existingWebsites.has(website) || seenEmails.has(email) || seenWebsites.has(website);
    const isSuppressed = suppressedEmails.has(email);
    seenEmails.add(email);
    seenWebsites.add(website);
    return {
      ...lead,
      previewId: `${run.id}-${index}`,
      duplicate,
      suppressed: isSuppressed,
      approved: !duplicate && !isSuppressed,
      rejected: false
    };
  });

  await prisma.leadDiscoveryRun.update({
    where: { id: run.id },
    data: { leadsFound: preview.length }
  });

  for (const lead of preview) {
    if (lead.duplicate) {
      await writeAudit("Duplicate skipped", "LeadDiscoveryRun", run.id, "Discovery preview duplicate", {
        email: lead.email,
        website: lead.website
      });
    } else if (lead.suppressed) {
      await writeAudit("Suppressed skipped", "LeadDiscoveryRun", run.id, "Discovery preview suppressed", { email: lead.email });
    } else {
      await writeAudit("Lead discovered", "LeadDiscoveryRun", run.id, "Lead discovered in preview", { email: lead.email });
    }
  }

  return { runId: run.id, provider: provider.name, results: preview };
}
