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
};

export function localAiPlaceholderScore(lead: Pick<Lead, "companyName" | "country" | "industry" | "niche" | "website" | "email" | "city" | "location" | "contactType">): AiScoreResult {
  const text = `${lead.companyName} ${lead.industry ?? ""} ${lead.niche ?? ""}`.toLowerCase();
  let score = 50;
  if (/realty|estate|letting|property|broker|real estate/.test(text)) score += 25;
  if (/united kingdom|uk|united states|usa/.test(lead.country.toLowerCase())) score += 8;
  if (lead.website) score += 5;
  if (lead.email) score += 5;
  if (lead.contactType === "Generic Business Email") score += 4;
  score = Math.max(1, Math.min(100, score));

  return {
    score,
    qualityLabel: qualityFromScore(score),
    reasonForScore: "Local placeholder score based on real estate relevance, UK/US location, public website, email availability, and contact type.",
    personalisationFirstLine: `I noticed ${lead.companyName} is active in ${lead.city || lead.location || lead.country}, so I thought this would be relevant.`,
    suggestedPainPoint: "New property leads may not be followed up quickly or consistently enough.",
    suggestedOfferAngle: "AI follow-up and automated booking for real estate lead conversion.",
    suggestedSubjectLine: `Quick question about ${lead.companyName}`,
    suggestedFirstEmail: `Hi {{first_name}},\n\nI came across ${lead.companyName} and had a quick idea around faster lead follow-up and booked appointments.\n\nWould you be open to a short call?\n\n{{unsubscribe_link}}`,
    recommendedCampaign: "UK and US Real Estate Agents",
    complianceRiskNotes: lead.contactType === "Generic Business Email" ? "Lower risk public business contact, still requires verification and unsubscribe." : "Review contact type and lawful basis before sending."
  };
}
