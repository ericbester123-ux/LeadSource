import { writeAudit } from "@/lib/audit";

export type GhlConfigStatus = {
  mode: "Preview Mode" | "Live GHL Sync Available";
  isConfigured: boolean;
  isPreviewMode: boolean;
  missingFields: string[];
  warnings: string[];
  configured: boolean;
  missing: string[];
  values: {
    locationId?: string;
    pipelineId?: string;
    stageNewLead?: string;
    stageInterested?: string;
    stageBooked?: string;
    stageNotInterested?: string;
    apiKeyConfigured: boolean;
  };
};

const requiredConfig = [
  ["GHL_API_KEY", "apiKey"],
  ["GHL_LOCATION_ID", "locationId"],
  ["GHL_PIPELINE_ID", "pipelineId"],
  ["GHL_STAGE_NEW_LEAD", "stageNewLead"],
  ["GHL_STAGE_INTERESTED", "stageInterested"],
  ["GHL_STAGE_BOOKED", "stageBooked"],
  ["GHL_STAGE_NOT_INTERESTED", "stageNotInterested"]
] as const;

export function validateGhlConfig(): GhlConfigStatus {
  const missingFields = requiredConfig
    .filter(([envKey]) => !process.env[envKey])
    .map(([envKey]) => envKey);
  const warnings: string[] = [];

  if (process.env.GHL_API_KEY && !process.env.GHL_LOCATION_ID) {
    warnings.push("GHL API key is configured, but the location ID is missing.");
  }
  if (process.env.GHL_PIPELINE_ID) {
    const missingStageIds = requiredConfig
      .filter(([envKey]) => envKey.startsWith("GHL_STAGE_") && !process.env[envKey])
      .map(([envKey]) => envKey);
    if (missingStageIds.length) {
      warnings.push("GHL opportunity sync needs all stage IDs before live opportunity sync can run.");
    }
  }

  const isConfigured = missingFields.length === 0;

  return {
    mode: isConfigured ? "Live GHL Sync Available" : "Preview Mode",
    isConfigured,
    isPreviewMode: !isConfigured,
    missingFields,
    warnings,
    configured: isConfigured,
    missing: missingFields,
    values: {
      locationId: process.env.GHL_LOCATION_ID,
      pipelineId: process.env.GHL_PIPELINE_ID,
      stageNewLead: process.env.GHL_STAGE_NEW_LEAD,
      stageInterested: process.env.GHL_STAGE_INTERESTED,
      stageBooked: process.env.GHL_STAGE_BOOKED,
      stageNotInterested: process.env.GHL_STAGE_NOT_INTERESTED,
      apiKeyConfigured: Boolean(process.env.GHL_API_KEY)
    }
  };
}

export async function getGhlConnectionStatus() {
  const status = validateGhlConfig();
  await writeAudit("GHL config checked", "IntegrationConfig", "ghl", status.mode, {
    configured: status.isConfigured,
    missing: status.missingFields,
    warnings: status.warnings
  });
  await writeAudit(
    status.isConfigured ? "GHL config valid" : "GHL config missing",
    "IntegrationConfig",
    "ghl",
    status.isConfigured ? "GHL live sync configuration is present." : "GHL preview mode is active because required fields are missing.",
    {
      missing: status.missingFields,
      warnings: status.warnings
    }
  );
  return status;
}
