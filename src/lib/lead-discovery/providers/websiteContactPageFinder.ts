import { DiscoveredLead } from "../types";

export async function findWebsiteContactPage(lead: DiscoveredLead) {
  return {
    ...lead,
    sourceUrl: lead.sourceUrl || `${lead.website.replace(/\/$/, "")}/contact`,
    sourcePlatform: lead.sourcePlatform || "Website Contact Page"
  };
}
