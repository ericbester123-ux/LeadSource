import { writeAudit } from "@/lib/audit";

export type GhlConfigStatus = {
  mode: "Preview Mode" | "Configured";
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
  const missing = requiredConfig
    .filter(([envKey]) => !process.env[envKey])
    .map(([envKey]) => envKey);

  return {
    mode: missing.length ? "Preview Mode" : "Configured",
    configured: missing.length === 0,
    missing,
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
    configured: status.configured,
    missing: status.missing
  });
  return status;
}
