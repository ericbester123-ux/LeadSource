import { prisma } from "@/lib/prisma";
import { writeAudit } from "@/lib/audit";
import { Lead } from "@prisma/client";
import { localAiProvider, AiLeadInput, AiScoreResult } from "./localAiPlaceholder";
import { openAiProvider } from "./openAiProvider";

const AI_PROVIDER_STATUS_KEY = "ai_provider_status";

export type AiProviderName = "local" | "openai";

export type AiProviderStatus = {
  selectedProvider: AiProviderName;
  activeProvider: AiProviderName;
  openAiApiKeyConfigured: boolean;
  localFallbackActive: boolean;
  fallbackReason?: string;
  lastProviderUsed?: string;
  lastSelectedProvider?: string;
};

function selectedProvider(): AiProviderName {
  return process.env.AI_PROVIDER?.toLowerCase() === "openai" ? "openai" : "local";
}

function parseStatusValue(value?: string) {
  if (!value) return {};
  try {
    return JSON.parse(value) as { selectedProvider?: string; lastProviderUsed?: string; fallbackReason?: string };
  } catch {
    return {};
  }
}

async function setLastProviderUsed(provider: AiProviderName, fallbackReason?: string) {
  await prisma.settings.upsert({
    where: { key: AI_PROVIDER_STATUS_KEY },
    update: {
      value: JSON.stringify({
        selectedProvider: selectedProvider(),
        lastProviderUsed: provider,
        fallbackReason,
        usedAt: new Date().toISOString()
      })
    },
    create: {
      key: AI_PROVIDER_STATUS_KEY,
      value: JSON.stringify({
        lastProviderUsed: provider,
        selectedProvider: selectedProvider(),
        fallbackReason,
        usedAt: new Date().toISOString()
      }),
      description: "Last AI provider used by LeadSource."
    }
  });
}

export async function getAiProviderStatus(): Promise<AiProviderStatus> {
  const selected = selectedProvider();
  const keyConfigured = Boolean(process.env.OPENAI_API_KEY);
  const statusRecord = await prisma.settings.findUnique({ where: { key: AI_PROVIDER_STATUS_KEY } });
  const parsed = parseStatusValue(statusRecord?.value);
  const fallbackReason = selected === "openai" && !keyConfigured ? "OPENAI_API_KEY is missing." : parsed.fallbackReason;

  return {
    selectedProvider: selected,
    activeProvider: selected === "openai" && keyConfigured ? "openai" : "local",
    openAiApiKeyConfigured: keyConfigured,
    localFallbackActive: selected === "local" || !keyConfigured,
    fallbackReason,
    lastProviderUsed: parsed.lastProviderUsed,
    lastSelectedProvider: parsed.selectedProvider
  };
}

export async function getAiProvider() {
  const status = await getAiProviderStatus();
  if (status.lastSelectedProvider && status.lastSelectedProvider !== status.selectedProvider) {
    await writeAudit("AI provider changed", "Settings", AI_PROVIDER_STATUS_KEY, "AI_PROVIDER environment selection changed.", {
      from: status.lastSelectedProvider,
      to: status.selectedProvider
    });
  }
  await writeAudit("OpenAI config checked", "IntegrationConfig", "openai", "AI provider configuration checked.", {
    selectedProvider: status.selectedProvider,
    openAiApiKeyConfigured: status.openAiApiKeyConfigured,
    activeProvider: status.activeProvider
  });

  if (status.selectedProvider === "openai" && !status.openAiApiKeyConfigured) {
    await writeAudit("AI fallback used", "IntegrationConfig", "openai", "OPENAI_API_KEY is missing; local AI fallback used.", {
      selectedProvider: status.selectedProvider,
      activeProvider: "local"
    });
    await setLastProviderUsed("local", "OPENAI_API_KEY is missing.");
    return { provider: localAiProvider, status: { ...status, activeProvider: "local" as const, fallbackReason: "OPENAI_API_KEY is missing." } };
  }

  if (status.activeProvider === "openai") {
    return { provider: openAiProvider, status };
  }

  await setLastProviderUsed("local");
  return { provider: localAiProvider, status };
}

export async function generateLeadScoreWithProvider(lead: AiLeadInput): Promise<AiScoreResult> {
  const { provider, status } = await getAiProvider();

  try {
    const result = await provider.generateLeadScore(lead);
    await setLastProviderUsed(status.activeProvider);
    return {
      ...result,
      providerUsed: status.activeProvider,
      fallbackReason: status.fallbackReason
    };
  } catch (error) {
    const reason = error instanceof Error ? error.message : "OpenAI request failed.";
    await writeAudit("OpenAI request failed", "IntegrationConfig", "openai", reason, {
      selectedProvider: status.selectedProvider,
      fallbackProvider: "local"
    });
    await writeAudit("AI fallback used", "IntegrationConfig", "openai", "OpenAI request failed; local AI fallback used.", {
      selectedProvider: status.selectedProvider,
      fallbackProvider: "local"
    });
    await setLastProviderUsed("local", reason);
    return {
      ...localAiProvider.generateLeadScore(lead),
      providerUsed: "local",
      fallbackReason: reason
    };
  }
}

async function withTextFallback<TLead, TResult>(
  operation: "generatePersonalisation" | "generateComplianceRiskNotes" | "generateSuggestedEmail",
  lead: TLead,
  fallback: (lead: TLead) => TResult,
  openAiCall: (lead: TLead) => Promise<TResult>
) {
  const { status } = await getAiProvider();
  if (status.activeProvider !== "openai") {
    return fallback(lead);
  }

  try {
    const result = await openAiCall(lead);
    await setLastProviderUsed("openai");
    return result;
  } catch (error) {
    const reason = error instanceof Error ? error.message : "OpenAI request failed.";
    await writeAudit("OpenAI request failed", "IntegrationConfig", "openai", reason, { operation, fallbackProvider: "local" });
    await writeAudit("AI fallback used", "IntegrationConfig", "openai", "OpenAI request failed; local AI fallback used.", { operation, fallbackProvider: "local" });
    await setLastProviderUsed("local", reason);
    return fallback(lead);
  }
}

export async function generatePersonalisationWithProvider(lead: Pick<Lead, "companyName" | "city" | "location" | "country">) {
  return withTextFallback(
    "generatePersonalisation",
    lead,
    localAiProvider.generatePersonalisation,
    openAiProvider.generatePersonalisation
  );
}

export async function generateComplianceRiskNotesWithProvider(lead: Pick<Lead, "country" | "contactType" | "sourceUrl" | "email">) {
  return withTextFallback(
    "generateComplianceRiskNotes",
    lead,
    localAiProvider.generateComplianceRiskNotes,
    openAiProvider.generateComplianceRiskNotes
  );
}

export async function generateSuggestedEmailWithProvider(lead: Pick<Lead, "companyName">) {
  return withTextFallback(
    "generateSuggestedEmail",
    lead,
    localAiProvider.generateSuggestedEmail,
    openAiProvider.generateSuggestedEmail
  );
}
