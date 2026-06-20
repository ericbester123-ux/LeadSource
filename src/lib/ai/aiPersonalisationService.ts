import { Lead } from "@prisma/client";

export function buildPersonalisationLine(lead: Pick<Lead, "companyName" | "city" | "location" | "country">) {
  return `I noticed ${lead.companyName} is active in ${lead.city || lead.location || lead.country}, so I thought this would be relevant.`;
}
