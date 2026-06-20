import { prisma } from "@/lib/prisma";
import { isValidEmail } from "@/lib/lead-utils";
import { writeAudit } from "@/lib/audit";
import { DiscoveryCriteria, DiscoveredLead } from "./types";
import { getLeadDiscoveryProvider } from "./leadDiscoveryProviderFactory";
import { checkLeadDuplicate } from "./leadDeduplicationService";
import { checkDiscoverySuppression } from "./leadSourceComplianceService";
import { findWebsiteContactPage } from "./providers/websiteContactPageFinder";

export type DiscoveryPreview = DiscoveredLead & {
  previewId: string;
  duplicate: boolean;
  duplicateReason?: string;
  suppressed: boolean;
  suppressionReason?: string;
  missingEmail: boolean;
  rejected?: boolean;
  approved?: boolean;
};

export async function runLeadDiscovery(criteria: DiscoveryCriteria) {
  const provider = getLeadDiscoveryProvider();
  const selectedProvider = process.env.LEAD_DISCOVERY_PROVIDER ?? "mock";
  const query = [
    criteria.keyword,
    criteria.keywords,
    criteria.companyType,
    criteria.niche,
    criteria.industry,
    criteria.city,
    criteria.regionState,
    criteria.country
  ].filter(Boolean).join(" ");
  const run = await prisma.leadDiscoveryRun.create({
    data: {
      query,
      country: criteria.country,
      city: criteria.city,
      region: criteria.regionState,
      state: criteria.regionState,
      industry: criteria.industry,
      niche: criteria.niche,
      keywords: criteria.keyword || criteria.keywords,
      companyType: criteria.companyType,
      minLeadScore: criteria.minLeadScore,
      maxLeadsPerDay: criteria.maxLeads,
      provider: provider.name,
      status: "Preview"
    }
  });

  await writeAudit("Discovery run started", "LeadDiscoveryRun", run.id, "Lead discovery preview created", criteria);
  if (provider.name === "Google Places") {
    await writeAudit("Google Places discovery started", "LeadDiscoveryRun", run.id, "Google Places discovery started", criteria);
  }
  const config = await prisma.integrationConfig.findUnique({ where: { id: "lead-discovery-provider" } });
  if (config?.config !== selectedProvider) {
    await writeAudit("Lead discovery provider changed", "IntegrationConfig", "lead-discovery-provider", "Lead discovery provider selection changed", {
      from: config?.config ?? "unset",
      to: selectedProvider,
      activeProvider: provider.name
    });
  }
  await prisma.integrationConfig.upsert({
    where: { id: "lead-discovery-provider" },
    update: { provider: "LeadDiscovery", name: provider.name, isEnabled: provider.name !== "Mock Discovery", config: selectedProvider },
    create: { id: "lead-discovery-provider", provider: "LeadDiscovery", name: provider.name, isEnabled: provider.name !== "Mock Discovery", config: selectedProvider }
  });

  try {
    const rawDiscovered = (await provider.discover(criteria)).slice(0, Math.max(1, Math.min(criteria.maxLeads || 10, 50)));
    const discovered = [];
    for (const lead of rawDiscovered) {
      const enriched = await findWebsiteContactPage(lead);
      if (enriched.contactPageUrl) {
        await writeAudit("Contact page found", "LeadDiscoveryRun", run.id, "Safe contact page finder found a likely contact page", {
          companyName: enriched.companyName,
          contactPageUrl: enriched.contactPageUrl
        });
      }
      if (!lead.email && enriched.email) {
        await writeAudit("Business email found", "LeadDiscoveryRun", run.id, "Public generic business email found on contact page", {
          companyName: enriched.companyName,
          email: enriched.email,
          sourceUrl: enriched.sourceUrl
        });
      }
      discovered.push(enriched);
    }
    const seen = new Set<string>();
    const preview: DiscoveryPreview[] = [];

    for (const [index, lead] of discovered.entries()) {
      const missingEmail = !lead.email || !isValidEmail(lead.email);
      const duplicateCheck = await checkLeadDuplicate(lead, seen);
      const suppressionCheck = await checkDiscoverySuppression(lead);
      preview.push({
      ...lead,
      previewId: `${run.id}-${index}`,
        duplicate: duplicateCheck.duplicate,
        duplicateReason: duplicateCheck.duplicateReason,
        suppressed: suppressionCheck.suppressed,
        suppressionReason: suppressionCheck.suppressionReason,
        missingEmail,
        approved: !duplicateCheck.duplicate && !suppressionCheck.suppressed && !missingEmail,
      rejected: false
      });
    }

  await prisma.leadDiscoveryRun.update({
    where: { id: run.id },
    data: { leadsFound: preview.length }
  });

  for (const lead of preview) {
      if (lead.missingEmail) {
        await writeAudit("Missing email discovered", "LeadDiscoveryRun", run.id, "Discovery result missing a valid email", {
          companyName: lead.companyName,
          sourceUrl: lead.sourceUrl
        });
      } else if (lead.duplicate) {
      await writeAudit("Duplicate skipped", "LeadDiscoveryRun", run.id, "Discovery preview duplicate", {
        email: lead.email,
          website: lead.website,
          reason: lead.duplicateReason
      });
    } else if (lead.suppressed) {
        await writeAudit("Suppressed skipped", "LeadDiscoveryRun", run.id, "Discovery preview suppressed", { email: lead.email, reason: lead.suppressionReason });
    } else {
      await writeAudit("Lead discovered", "LeadDiscoveryRun", run.id, "Lead discovered in preview", { email: lead.email });
    }
  }

    await writeAudit("Discovery run completed", "LeadDiscoveryRun", run.id, "Lead discovery preview completed", {
      provider: provider.name,
      totalFound: preview.length,
      missingEmail: preview.filter((lead) => lead.missingEmail).length,
      duplicatesSkipped: preview.filter((lead) => lead.duplicate).length,
      suppressedSkipped: preview.filter((lead) => lead.suppressed).length
    });
    if (provider.name === "Google Places") {
      await writeAudit("Google Places discovery completed", "LeadDiscoveryRun", run.id, "Google Places discovery completed", {
        totalFound: preview.length
      });
    }
    return { runId: run.id, provider: provider.name, results: preview };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Discovery run failed.";
    await prisma.leadDiscoveryRun.update({ where: { id: run.id }, data: { status: "Failed" } });
    await writeAudit("Discovery run failed", "LeadDiscoveryRun", run.id, message, { provider: provider.name });
    if (provider.name === "Google Places") {
      await writeAudit("Google Places discovery failed", "LeadDiscoveryRun", run.id, message, { provider: provider.name });
    }
    return { runId: run.id, provider: provider.name, results: [] };
  }
}
