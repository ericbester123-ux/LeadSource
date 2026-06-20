import { Lead } from "@prisma/client";
import { scoreLeadWithOpenAi } from "./openAiProvider";

export async function scoreLead(lead: Pick<Lead, "companyName" | "country" | "industry" | "niche" | "website" | "email" | "city" | "location" | "contactType">) {
  return scoreLeadWithOpenAi(lead);
}
