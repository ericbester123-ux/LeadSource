import { Lead } from "@prisma/client";

export function assessAiComplianceRisk(lead: Pick<Lead, "country" | "contactType" | "sourceUrl">) {
  if (!lead.sourceUrl) return "Needs Manual Approval: missing source URL.";
  if (lead.contactType !== "Generic Business Email") return "Needs Manual Approval: named or uncertain contact type.";
  if (!["United Kingdom", "United States", "UK", "USA"].some((country) => lead.country.includes(country))) {
    return "Needs Manual Approval: outside default UK/US target profile.";
  }
  return "Lower risk if email is verified and unsubscribe is included.";
}
