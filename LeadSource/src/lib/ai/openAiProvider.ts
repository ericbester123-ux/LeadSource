import { Lead } from "@prisma/client";
import { AiLeadInput, AiScoreResult, localAiPlaceholderScore } from "./localAiPlaceholder";

const OPENAI_RESPONSES_URL = "https://api.openai.com/v1/responses";
const DEFAULT_OPENAI_MODEL = "gpt-4.1-mini";

type OpenAiJsonShape = Partial<AiScoreResult> & {
  score?: number;
};

function responseText(data: unknown) {
  const value = data as {
    output_text?: string;
    output?: Array<{ content?: Array<{ text?: string; type?: string }> }>;
  };
  return value.output_text ?? value.output?.flatMap((item) => item.content ?? []).find((item) => item.text)?.text;
}

function parseJson(text: string): OpenAiJsonShape {
  const cleaned = text.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```$/i, "").trim();
  return JSON.parse(cleaned) as OpenAiJsonShape;
}

function normalizeScoreResult(lead: AiLeadInput, generated: OpenAiJsonShape): AiScoreResult {
  const fallback = localAiPlaceholderScore(lead);
  const score = Number.isFinite(generated.score) ? Math.max(1, Math.min(100, Number(generated.score))) : fallback.score;
  return {
    score,
    qualityLabel: generated.qualityLabel || fallback.qualityLabel,
    reasonForScore: generated.reasonForScore || fallback.reasonForScore,
    personalisationFirstLine: generated.personalisationFirstLine || fallback.personalisationFirstLine,
    suggestedPainPoint: generated.suggestedPainPoint || fallback.suggestedPainPoint,
    suggestedOfferAngle: generated.suggestedOfferAngle || fallback.suggestedOfferAngle,
    suggestedSubjectLine: generated.suggestedSubjectLine || fallback.suggestedSubjectLine,
    suggestedFirstEmail: generated.suggestedFirstEmail || fallback.suggestedFirstEmail,
    recommendedCampaign: generated.recommendedCampaign || fallback.recommendedCampaign,
    complianceRiskNotes: generated.complianceRiskNotes || fallback.complianceRiskNotes,
    providerUsed: "openai"
  };
}

async function callOpenAiJson(prompt: string) {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OpenAI API key is missing.");
  }

  const response = await fetch(OPENAI_RESPONSES_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || DEFAULT_OPENAI_MODEL,
      input: prompt,
      text: { format: { type: "json_object" } }
    }),
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error(`OpenAI request failed with status ${response.status}.`);
  }

  const data = await response.json();
  const text = responseText(data);
  if (!text) throw new Error("OpenAI returned no generated text.");
  return parseJson(text);
}

export async function generateLeadScore(lead: AiLeadInput): Promise<AiScoreResult> {
  const generated = await callOpenAiJson(
    `Score this B2B real estate lead for Estates Elevate. Return JSON only with keys: score, qualityLabel, reasonForScore, personalisationFirstLine, suggestedPainPoint, suggestedOfferAngle, suggestedSubjectLine, suggestedFirstEmail, recommendedCampaign, complianceRiskNotes. Lead: ${JSON.stringify(lead)}`
  );
  return normalizeScoreResult(lead, generated);
}

export async function generatePersonalisation(lead: Pick<Lead, "companyName" | "city" | "location" | "country">) {
  const generated = await callOpenAiJson(
    `Write one concise B2B personalisation first line for this real estate lead. Return JSON only with key personalisationFirstLine. Lead: ${JSON.stringify(lead)}`
  );
  return String(generated.personalisationFirstLine || "");
}

export async function generateComplianceRiskNotes(lead: Pick<Lead, "country" | "contactType" | "sourceUrl" | "email">) {
  const generated = await callOpenAiJson(
    `Assess operational outreach compliance risk for this lead. Return JSON only with key complianceRiskNotes. This is not legal advice. Lead: ${JSON.stringify(lead)}`
  );
  return String(generated.complianceRiskNotes || "");
}

export async function generateSuggestedEmail(lead: Pick<Lead, "companyName">) {
  const generated = await callOpenAiJson(
    `Draft a concise first cold email for Estates Elevate to this real estate lead. Include {{unsubscribe_link}}. Return JSON only with key suggestedFirstEmail. Lead: ${JSON.stringify(lead)}`
  );
  return String(generated.suggestedFirstEmail || "");
}

export const openAiProvider = {
  name: "openai",
  generateLeadScore,
  generatePersonalisation,
  generateComplianceRiskNotes,
  generateSuggestedEmail
};
