import { prisma } from "@/lib/prisma";
import { DiscoveredLead } from "./types";

export type DeduplicationResult = {
  duplicate: boolean;
  duplicateReason?: string;
};

function normalize(value?: string | null) {
  return value?.trim().toLowerCase() || "";
}

export async function checkLeadDuplicate(lead: DiscoveredLead, seen: Set<string> = new Set()): Promise<DeduplicationResult> {
  const email = normalize(lead.email);
  const website = normalize(lead.website);
  const companyCity = `${normalize(lead.companyName)}:${normalize(lead.city)}`;
  const googlePlaceId = normalize(lead.googlePlaceId);
  const keys = [email && `email:${email}`, website && `website:${website}`, companyCity !== ":" && `company-city:${companyCity}`, googlePlaceId && `google-place:${googlePlaceId}`].filter(Boolean) as string[];

  if (keys.some((key) => seen.has(key))) return { duplicate: true, duplicateReason: "Duplicate in current preview." };

  if (email) {
    const match = await prisma.lead.findUnique({ where: { email } });
    if (match) return { duplicate: true, duplicateReason: "Email already exists." };
  }
  if (website) {
    const match = await prisma.lead.findFirst({ where: { website: { equals: lead.website } } });
    if (match) return { duplicate: true, duplicateReason: "Website already exists." };
  }
  if (lead.companyName && lead.city) {
    const match = await prisma.lead.findFirst({ where: { companyName: lead.companyName, city: lead.city } });
    if (match) return { duplicate: true, duplicateReason: "Company and city already exist." };
  }
  if (googlePlaceId) {
    const match = await prisma.lead.findFirst({ where: { googlePlaceId: lead.googlePlaceId } });
    if (match) return { duplicate: true, duplicateReason: "Google Place ID already exists." };
  }

  keys.forEach((key) => seen.add(key));
  return { duplicate: false };
}
