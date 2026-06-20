import { DiscoveredLead } from "../types";

const contactPaths = ["/contact", "/contact-us", "/about", "/team"];
const genericBusinessEmailPattern = /\b(info|hello|sales|enquiries|enquiry|contact|office|team)@[a-z0-9.-]+\.[a-z]{2,}\b/i;

async function robotsAllows(origin: string) {
  try {
    const response = await fetch(`${origin}/robots.txt`, { cache: "no-store" });
    if (!response.ok) return true;
    const text = await response.text();
    const disallowedAll = text.split(/\r?\n/).some((line) => line.trim().toLowerCase() === "disallow: /");
    return !disallowedAll;
  } catch {
    return true;
  }
}

async function readLikelyContactPage(url: URL) {
  try {
    const response = await fetch(url, {
      cache: "no-store",
      headers: { "user-agent": "LeadSource contact page checker; shallow business contact discovery" }
    });
    if (!response.ok) return null;
    const contentType = response.headers.get("content-type") ?? "";
    if (!contentType.includes("text/html") && !contentType.includes("text/plain")) return null;
    const body = (await response.text()).slice(0, 100_000);
    return {
      url: url.toString(),
      email: body.match(genericBusinessEmailPattern)?.[0]?.toLowerCase()
    };
  } catch {
    return null;
  }
}

export async function findWebsiteContactPage(lead: DiscoveredLead) {
  if (!lead.website) {
    return {
      ...lead,
      sourceUrl: lead.sourceUrl || "Manual review required",
      sourcePlatform: lead.sourcePlatform || "Website Contact Page"
    };
  }

  const website = new URL(lead.website);
  const allowed = await robotsAllows(website.origin);
  if (!allowed) {
    return {
      ...lead,
      leadSourceNotes: [lead.leadSourceNotes, "Robots.txt blocks broad crawling; contact page lookup skipped."].filter(Boolean).join(" ")
    };
  }

  for (const path of contactPaths) {
    const candidate = new URL(path, website.origin);
    const result = await readLikelyContactPage(candidate);
    if (result) {
      return {
        ...lead,
        email: lead.email ?? result.email,
        contactPageUrl: result.url,
        sourceUrl: result.email ? result.url : lead.sourceUrl || result.url,
        sourcePlatform: lead.sourcePlatform || "Website Contact Page",
        leadSourceNotes: [
          lead.leadSourceNotes,
          result.email ? "Public generic business email found on likely contact page." : "Likely contact page found; no generic business email detected."
        ].filter(Boolean).join(" ")
      };
    }
  }

  const fallbackSource = `${lead.website.replace(/\/$/, "")}/contact`;
  return {
    ...lead,
    contactPageUrl: fallbackSource,
    sourceUrl: lead.sourceUrl || fallbackSource || "Manual review required",
    sourcePlatform: lead.sourcePlatform || "Website Contact Page"
  };
}
