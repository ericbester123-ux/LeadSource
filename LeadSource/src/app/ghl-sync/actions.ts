"use server";

import { revalidatePath } from "next/cache";
import { writeAudit } from "@/lib/audit";
import { getGhlConnectionStatus, validateGhlConfig } from "@/lib/ghl/ghlConfigValidator";
import { bulkSyncLeadsToGhl, markGhlSyncSkipped, prepareLeadForGhl, previewGhlPayload, recordGhlReadyCsvExport, retryFailedGhlSync, syncLeadToGhl } from "@/lib/ghl/ghlService";

function value(formData: FormData, key: string) {
  const raw = formData.get(key);
  return typeof raw === "string" && raw.trim() ? raw.trim() : undefined;
}

function values(formData: FormData, key: string) {
  return formData.getAll(key).filter((item): item is string => typeof item === "string" && Boolean(item));
}

export async function previewGhlPayloadAction(formData: FormData) {
  const leadId = value(formData, "leadId");
  if (!leadId) return;
  const result = await previewGhlPayload(leadId);
  revalidatePath("/ghl-sync");
  return result.payload;
}

export async function prepareLeadForGhlAction(formData: FormData) {
  const leadId = value(formData, "leadId");
  if (!leadId) return;
  await prepareLeadForGhl(leadId);
  revalidatePath("/ghl-sync");
  revalidatePath("/leads");
}

export async function syncLeadToGhlAction(formData: FormData) {
  const leadId = value(formData, "leadId");
  if (!leadId) return;
  await syncLeadToGhl(leadId, { force: value(formData, "force") === "true", source: "manual" });
  revalidatePath("/ghl-sync");
  revalidatePath("/leads");
}

export async function bulkSyncLeadsToGhlAction(formData: FormData) {
  const leadIds = values(formData, "leadIds");
  if (!leadIds.length) return;
  await bulkSyncLeadsToGhl(leadIds, { source: "bulk" });
  revalidatePath("/ghl-sync");
  revalidatePath("/leads");
}

export async function retryFailedGhlSyncAction(formData: FormData) {
  const logId = value(formData, "logId");
  if (!logId) return;
  await retryFailedGhlSync(logId);
  revalidatePath("/ghl-sync");
  revalidatePath("/leads");
}

export async function markGhlSyncSkippedAction(formData: FormData) {
  const leadId = value(formData, "leadId");
  if (!leadId) return;
  await markGhlSyncSkipped(leadId, value(formData, "reason") ?? "Skipped manually.");
  revalidatePath("/ghl-sync");
  revalidatePath("/leads");
}

export async function exportGhlReadyCsvAction(formData: FormData) {
  const count = Number(value(formData, "count") ?? 0);
  await recordGhlReadyCsvExport(count);
  revalidatePath("/ghl-sync");
}

export async function checkGhlConfigAction() {
  await getGhlConnectionStatus();
  revalidatePath("/ghl-sync");
}

export async function recordGhlCredentialsReviewedAction() {
  const status = validateGhlConfig();
  await writeAudit("GHL credentials updated", "IntegrationConfig", "ghl", "GHL credentials/configuration reviewed from environment variables", {
    apiKeyConfigured: status.values.apiKeyConfigured,
    locationIdConfigured: Boolean(status.values.locationId),
    pipelineIdConfigured: Boolean(status.values.pipelineId),
    configured: status.configured
  });
  revalidatePath("/settings");
  revalidatePath("/ghl-sync");
}
