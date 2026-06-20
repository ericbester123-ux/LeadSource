import { Lead } from "@prisma/client";
import { AiScoreResult, localAiPlaceholderScore } from "./localAiPlaceholder";

export async function scoreLeadWithOpenAi(lead: Pick<Lead, "companyName" | "country" | "industry" | "niche" | "website" | "email" | "city" | "location" | "contactType">): Promise<AiScoreResult> {
  if (!process.env.OPENAI_API_KEY) {
    return localAiPlaceholderScore(lead);
  }

  try {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-4.1-mini",
        input: `Score this B2B real estate lead for Estates Elevate and return compact JSON only: ${JSON.stringify(lead)}`
      })
    });
    const data = await response.json();
    const text = data.output_text ?? data.output?.[0]?.content?.[0]?.text;
    return text ? JSON.parse(text) : localAiPlaceholderScore(lead);
  } catch {
    return localAiPlaceholderScore(lead);
  }
}
