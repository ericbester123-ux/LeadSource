import { Lead } from "@prisma/client";
import { generatePersonalisationWithProvider } from "./aiProviderFactory";

export async function buildPersonalisationLine(lead: Pick<Lead, "companyName" | "city" | "location" | "country">) {
  return generatePersonalisationWithProvider(lead);
}
