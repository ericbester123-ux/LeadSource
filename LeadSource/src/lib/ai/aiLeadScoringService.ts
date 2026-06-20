import { Lead } from "@prisma/client";
import { AiLeadInput } from "./localAiPlaceholder";
import { generateLeadScoreWithProvider } from "./aiProviderFactory";

export async function scoreLead(lead: Pick<Lead, "companyName" | "country" | "industry" | "niche" | "website" | "email" | "city" | "location" | "contactType" | "contactPageUrl" | "sourceUrl">) {
  return generateLeadScoreWithProvider(lead as AiLeadInput);
}
