import { Lead } from "@prisma/client";
import { generateComplianceRiskNotesWithProvider } from "./aiProviderFactory";

export async function assessAiComplianceRisk(lead: Pick<Lead, "country" | "contactType" | "sourceUrl" | "email">) {
  return generateComplianceRiskNotesWithProvider(lead);
}
