import { Lead } from "@prisma/client";
import { qualityFromScore } from "@/lib/lead-utils";

export type AiScoreResult = {
  score: number;
  qualityLabel: string;
  reasonForScore: string;
  personalisationFirstLine: string;
  suggestedPainPoint: string;
  suggestedOfferAngle: string;
  suggestedSubjectLine: string;
  suggestedFirstEmail: string;
  recommendedCampaign: string;
  complianceRiskNotes: string;
  providerUsed?: string;
  fallbackReason?: string;
};

export type AiLeadInput = Pick<Lead, "companyName" | "country" | "industry" | "niche" | "website" | "email" | "city" | "location" | "contactType" | "contactPageUrl" | "sourceUrl">;

export function generatePersonalisation(lead: Pick<Lead, "companyName" | "city" | "location" | "country">) {
  return `I noticed ${lead.companyName} is active in ${lead.city || lead.location || lead.country}, so I thought this would be relevant.`;
}

export function generateComplianceRiskNotes(lead: Pick<Lead, "country" | "contactType" | "sourceUrl" | "email">) {
  if (!lead.sourceUrl) return "Needs Manual Approval: missing source URL.";
  if (!lead.email) return "Needs Manual Approval: email is missing.";
  if (lead.contactType !== "Generic Business Email") return "Needs Manual Approval: named or uncertain contact type.";
  if (!["United Kingdom", "United States", "UK", "USA"].some((country) => lead.country.includes(country))) {
    return "Needs Manual Approval: outside default UK/US target profile.";
  }
  return "Lower risk if email is verified and unsubscribe is included.";
}

export function generateSuggestedEmail(lead: Pick<Lead, "companyName">) {
  return `Hi {{first_name}},\n\nI came across ${lead.companyName} and had a quick idea around faster lead follow-up and booked appointments.\n\nWould you be open to a short call?\n\n{{unsubscribe_link}}`;
}

export function localAiPlaceholderScore(lead: AiLeadInput): AiScoreResult {
  const text = `${lead.companyName} ${lead.industry ?? ""} ${lead.niche ?? ""}`.toLowerCase();
  let score = 50;
  if (/realty|estate|letting|property|broker|real estate/.test(text)) score += 25;
  if (/united kingdom|uk|united states|usa/.test(lead.country.toLowerCase())) score += 8;
  if (lead.website) score += 5;
  if (lead.email) score += 5;
  if (lead.contactPageUrl) score += 3;
  if (lead.contactType === "Generic Business Email") score += 4;
  score = Math.max(1, Math.min(100, score));

  return {
    score,
    qualityLabel: qualityFromScore(score),
    reasonForScore: "Local placeholder score based on real estate relevance, UK/US location, public website, email availability, contact page, and contact type.",
    personalisationFirstLine: generatePersonalisation(lead),
    suggestedPainPoint: "New property leads may not be followed up quickly or consistently enough.",
    suggestedOfferAngle: "AI follow-up and automated booking for real estate lead conversion.",
    suggestedSubjectLine: `Quick question about ${lead.companyName}`,
    suggestedFirstEmail: generateSuggestedEmail(lead),
    recommendedCampaign: "UK and US Real Estate Agents",
    complianceRiskNotes: generateComplianceRiskNotes({
      country: lead.country,
      contactType: lead.contactType,
      sourceUrl: lead.sourceUrl ?? lead.website,
      email: lead.email
    }),
    providerUsed: "local"
  };
}

export const localAiProvider = {
  name: "local",
  generateLeadScore: localAiPlaceholderScore,
  generatePersonalisation,
  generateComplianceRiskNotes,
  generateSuggestedEmail
};
