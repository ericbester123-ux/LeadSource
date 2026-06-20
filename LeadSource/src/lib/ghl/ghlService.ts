import { prisma } from "@/lib/prisma";
import { writeAudit } from "@/lib/audit";
import { buildGhlContactPayload, ghlLeadInclude } from "./ghlContactMapper";
import { buildGhlOpportunityPayload } from "./ghlOpportunityMapper";
import { validateGhlConfig } from "./ghlConfigValidator";
import {
  createContact,
  createOpportunity,
  searchContactByEmail,
  updateContact,
  updateOpportunity
} from "./ghlApiClient";
import { getGhlAutoSyncSettings } from "./ghlAutoSyncSettings";

type GhlSyncOptions = {
  force?: boolean;
  retryOfLogId?: string;
  source?: "manual" | "bulk" | "retry" | "auto";
};

export async function getGhlPreparationIssues(leadId: string) {
  const lead = await prisma.lead.findUnique({
    where: { id: leadId },
    include: {
      complianceCheck: true,
      emailVerification: true
    }
  });
  if (!lead) return ["Lead not found."];

  const issues: string[] = [];
  if (!lead.email) issues.push("Email is missing.");
  if (!lead.phone && !lead.email) issues.push("Lead has no meaningful contact details.");
  if (lead.doNotContact) issues.push("Lead is marked do-not-contact.");
  if (lead.unsubscribed) issues.push("Lead is unsubscribed.");
  if (lead.bounced) issues.push("Lead has bounced.");
  if (lead.status === "Not Interested") issues.push("Lead is not interested.");
  if (!["Interested", "Booked Appointment"].includes(lead.status)) issues.push("Lead status is not Interested or Booked Appointment.");
  if (["Failed", "Suppressed", "Unsubscribed", "Do Not Contact"].includes(lead.complianceCheck?.status ?? "")) {
    issues.push(`Compliance blocked: ${lead.complianceCheck?.status}.`);
  }

  const suppressed = lead.email ? await prisma.suppressionListEntry.findUnique({ where: { email: lead.email } }) : null;
  if (suppressed) issues.push(`Suppression list match: ${suppressed.reason}.`);

  return issues;
}

export async function buildGhlPayload(leadId: string) {
  const lead = await prisma.lead.findUnique({
    where: { id: leadId },
    include: ghlLeadInclude
  });
  if (!lead) throw new Error("Lead not found.");

  const config = validateGhlConfig();
  return {
    mode: config.mode,
    leadId: lead.id,
    contact: buildGhlContactPayload(lead),
    opportunity: buildGhlOpportunityPayload(lead)
  };
}

export async function previewGhlPayload(leadId: string) {
  const payload = await buildGhlPayload(leadId);
  const log = await prisma.gHLSyncLog.create({
    data: {
      leadId,
      syncStatus: "Skipped",
      payload: JSON.stringify(payload, null, 2),
      response: JSON.stringify({ mode: payload.mode, liveSync: false }),
      error: payload.mode === "Preview Mode" ? "GHL credentials missing or incomplete. Preview only." : undefined
    }
  });

  await writeAudit("GHL payload previewed", "GHLSyncLog", log.id, "GHL payload preview generated", {
    leadId,
    mode: payload.mode
  });

  return { payload, log };
}

export async function prepareLeadForGhl(leadId: string) {
  const issues = await getGhlPreparationIssues(leadId);
  if (issues.length) {
    await prisma.lead.update({
      where: { id: leadId },
      data: { ghlSyncStatus: "Failed", ghlSyncError: issues.join(" ") }
    });
    await prisma.gHLSyncLog.create({
      data: {
        leadId,
        syncStatus: "Failed",
        error: issues.join(" ")
      }
    });
    await writeAudit("Lead prepared for GHL", "Lead", leadId, "Lead failed GHL preparation checks", { issues });
    return { ok: false, issues };
  }

  const lead = await prisma.lead.update({
    where: { id: leadId },
    data: {
      ghlSyncStatus: "Ready for GHL",
      ghlSyncError: null
    }
  });
  await writeAudit("Lead prepared for GHL", "Lead", leadId, "Lead marked Ready for GHL", {
    status: lead.status,
    previewMode: validateGhlConfig().isPreviewMode
  });
  return { ok: true, issues: [] };
}

async function getManualSyncIssues(leadId: string, force?: boolean) {
  const issues = await getGhlPreparationIssues(leadId);
  if (force) return issues.filter((issue) => issue !== "Lead status is not Interested or Booked Appointment.");
  return issues;
}

export async function createOrUpdateGhlContact(payload: Awaited<ReturnType<typeof buildGhlPayload>>["contact"]) {
  const existing = payload.email ? await searchContactByEmail(payload.email) : null;
  if (existing && !existing.ok && !existing.previewMode) {
    throw new Error(existing.error ?? "Unable to search GoHighLevel contact by email.");
  }

  const result = existing?.ghlContactId
    ? await updateContact(existing.ghlContactId, payload)
    : await createContact(payload);

  if (!result.ok) {
    throw new Error(result.error ?? "Unable to create or update GoHighLevel contact.");
  }

  const generatedPreviewId = `preview_contact_${Buffer.from(payload.email || payload.companyName).toString("base64url").slice(0, 18)}`;

  return {
    ok: true,
    provider: "ghl",
    ghlContactId: result.ghlContactId ?? generatedPreviewId,
    response: {
      previewMode: result.previewMode,
      operation: "createOrUpdateContact",
      request: result.request,
      email: payload.email,
      companyName: payload.companyName,
      result: result.data ?? null
    }
  };
}

export async function createOrUpdateGhlOpportunity(
  payload: Awaited<ReturnType<typeof buildGhlPayload>>["opportunity"],
  contactId: string,
  existingOpportunityId?: string | null
) {
  const requestPayload = { ...payload, contactId };
  const result = existingOpportunityId
    ? await updateOpportunity(existingOpportunityId, requestPayload)
    : await createOpportunity(requestPayload);

  if (!result.ok) {
    throw new Error(result.error ?? "Unable to create or update GoHighLevel opportunity.");
  }

  const generatedPreviewId = `preview_opp_${Buffer.from(`${contactId}:${payload.name}`).toString("base64url").slice(0, 18)}`;

  return {
    ok: true,
    provider: "ghl",
    ghlOpportunityId: result.ghlOpportunityId ?? existingOpportunityId ?? generatedPreviewId,
    response: {
      previewMode: result.previewMode,
      operation: "createOrUpdateOpportunity",
      request: result.request,
      contactId,
      pipelineId: payload.pipelineId,
      pipelineStageId: payload.pipelineStageId,
      result: result.data ?? null
    }
  };
}

export async function syncLeadToGhl(leadId: string, options: GhlSyncOptions = {}) {
  const config = validateGhlConfig();
  const payload = await buildGhlPayload(leadId);
  const issues = await getManualSyncIssues(leadId, options.force);
  const source = options.source ?? "manual";

  await writeAudit(source === "retry" ? "GHL sync retried" : "GHL sync attempted", "Lead", leadId, `GHL sync attempt started in ${config.mode}`, {
    configured: config.isConfigured,
    source,
    retryOfLogId: options.retryOfLogId
  });

  if (issues.length) {
    const error = issues.join(" ");
    const log = await prisma.gHLSyncLog.create({
      data: {
        leadId,
        syncStatus: "Failed",
        payload: JSON.stringify(payload, null, 2),
        error
      }
    });
    await prisma.lead.update({ where: { id: leadId }, data: { ghlSyncStatus: "Failed", ghlSyncError: error } });
    await writeAudit("GHL sync failed", "GHLSyncLog", log.id, error, { leadId, source });
    return { ok: false, mode: config.mode, status: "Failed", error, log };
  }

  if (config.isPreviewMode) {
    const log = await prisma.gHLSyncLog.create({
      data: {
        leadId,
        syncStatus: "Ready for GHL",
        payload: JSON.stringify(payload, null, 2),
        response: JSON.stringify({ mode: "Preview Mode", liveSync: false })
      }
    });
    await prisma.lead.update({
      where: { id: leadId },
      data: { ghlSyncStatus: "Ready for GHL", ghlSyncError: null }
    });
    await writeAudit("GHL preview mode used", "GHLSyncLog", log.id, "GHL credentials missing; JSON preview workflow used.", {
      leadId,
      missingFields: config.missingFields
    });
    await writeAudit("Lead prepared for GHL", "Lead", leadId, "GHL credentials missing; lead remains Ready for GHL in Preview Mode", { logId: log.id });
    return { ok: true, mode: config.mode, status: "Ready for GHL", payload, log };
  }

  try {
    await writeAudit("GHL API client initialized", "IntegrationConfig", "ghl", "GHL API client initialized for live sync attempt.", {
      leadId,
      locationIdConfigured: Boolean(config.values.locationId),
      pipelineIdConfigured: Boolean(config.values.pipelineId)
    });
    const lead = await prisma.lead.findUnique({ where: { id: leadId }, select: { ghlOpportunityId: true } });
    const contact = await createOrUpdateGhlContact(payload.contact);
    const opportunity = payload.opportunity.pipelineId
      ? await createOrUpdateGhlOpportunity(payload.opportunity, contact.ghlContactId, lead?.ghlOpportunityId)
      : null;
    const response = { contact: contact.response, opportunity: opportunity?.response ?? null };
    const syncedAt = new Date();
    const log = await prisma.gHLSyncLog.create({
      data: {
        leadId,
        syncStatus: "Synced",
        ghlContactId: contact.ghlContactId,
        ghlOpportunityId: opportunity?.ghlOpportunityId,
        payload: JSON.stringify(payload, null, 2),
        response: JSON.stringify(response, null, 2),
        syncedAt
      }
    });
    await prisma.lead.update({
      where: { id: leadId },
      data: {
        ghlSyncStatus: "Synced",
        ghlContactId: contact.ghlContactId,
        ghlOpportunityId: opportunity?.ghlOpportunityId,
        ghlLastSyncedAt: syncedAt,
        ghlSyncError: null
      }
    });
    await writeAudit("Lead synced to GHL", "GHLSyncLog", log.id, "Lead synced through GHL architecture", { leadId, source });
    return { ok: true, mode: config.mode, status: "Synced", payload, log };
  } catch (error) {
    const message = error instanceof Error ? error.message : "GHL sync failed.";
    const log = await prisma.gHLSyncLog.create({
      data: {
        leadId,
        syncStatus: "Failed",
        payload: JSON.stringify(payload, null, 2),
        error: message
      }
    });
    await prisma.lead.update({ where: { id: leadId }, data: { ghlSyncStatus: "Failed", ghlSyncError: message } });
    await writeAudit("GHL sync failed", "GHLSyncLog", log.id, message, { leadId, source });
    return { ok: false, mode: config.mode, status: "Failed", error: message, log };
  }
}

export async function bulkSyncLeadsToGhl(leadIds: string[], options: GhlSyncOptions = {}) {
  await writeAudit("Bulk sync started", "GHLSyncLog", undefined, "Bulk GHL sync started", { count: leadIds.length });
  const results = [];
  for (const leadId of leadIds) {
    results.push(await syncLeadToGhl(leadId, { ...options, source: "bulk" }));
  }
  await writeAudit("Bulk sync completed", "GHLSyncLog", undefined, "Bulk GHL sync completed", {
    count: leadIds.length,
    synced: results.filter((result) => result.status === "Synced").length,
    ready: results.filter((result) => result.status === "Ready for GHL").length,
    failed: results.filter((result) => result.status === "Failed").length
  });
  return results;
}

export async function retryFailedGhlSync(logId: string) {
  const log = await prisma.gHLSyncLog.findUnique({ where: { id: logId } });
  if (!log) return { ok: false, error: "Failed sync log not found." };
  return syncLeadToGhl(log.leadId, { retryOfLogId: log.id, source: "retry" });
}

export async function maybeAutoSyncLeadToGhl(leadId: string, trigger: "Interested" | "Booked Appointment") {
  const lead = await prisma.lead.findUnique({
    where: { id: leadId },
    include: { complianceCheck: true }
  });
  const settings = await getGhlAutoSyncSettings();
  const config = validateGhlConfig();
  const autoEnabled = trigger === "Interested"
    ? settings.autoSyncInterestedLeadsToGhl
    : settings.autoSyncBookedLeadsToGhl;

  if (!lead) {
    await writeAudit("Auto-sync skipped", "Lead", leadId, "Lead not found for GHL auto-sync.", { trigger });
    return { ok: false, skipped: true };
  }

  await prisma.lead.update({
    where: { id: leadId },
    data: { ghlSyncStatus: "Ready for GHL", ghlSyncError: null }
  });

  if (!autoEnabled) {
    await writeAudit("Auto-sync skipped", "Lead", leadId, "GHL auto-sync is disabled in Settings.", {
      trigger,
      interestedEnabled: settings.autoSyncInterestedLeadsToGhl,
      bookedEnabled: settings.autoSyncBookedLeadsToGhl
    });
    return { ok: false, skipped: true, reason: "Auto-sync disabled" };
  }

  const safetyIssues = await getGhlPreparationIssues(leadId);
  if (safetyIssues.length) {
    const reason = safetyIssues.join(" ");
    await prisma.lead.update({ where: { id: leadId }, data: { ghlSyncError: reason } });
    await writeAudit("Auto-sync skipped", "Lead", leadId, reason, { trigger, safetyIssues });
    return { ok: false, skipped: true, reason };
  }

  await writeAudit("Auto-sync triggered", "Lead", leadId, "GHL auto-sync was requested from reply handling.", { trigger, mode: config.mode });

  if (config.isPreviewMode) {
    await writeAudit("Auto-sync skipped", "Lead", leadId, "GHL credentials are missing; lead left Ready for GHL in Preview Mode.", {
      trigger,
      missingFields: config.missingFields
    });
    return { ok: false, skipped: true, reason: "Preview Mode" };
  }

  const result = await syncLeadToGhl(leadId, { source: "auto" });
  await writeAudit(result.ok ? "Auto-sync completed" : "Auto-sync failed", "Lead", leadId, "Auto-sync attempted after reply", {
    trigger,
    status: result.status,
    error: "error" in result ? result.error : undefined
  });
  return result;
}

export async function markGhlSyncSkipped(leadId: string, reason = "Skipped manually.") {
  await prisma.lead.update({
    where: { id: leadId },
    data: {
      ghlSyncStatus: "Skipped",
      ghlSyncError: reason
    }
  });
  const log = await prisma.gHLSyncLog.create({
    data: {
      leadId,
      syncStatus: "Skipped",
      error: reason
    }
  });
  await writeAudit("GHL sync skipped", "GHLSyncLog", log.id, reason, { leadId });
  return log;
}

export async function recordGhlReadyCsvExport(count: number) {
  await writeAudit("GHL CSV export generated", "GHLSyncLog", undefined, "GHL ready CSV exported", { count });
}

export async function syncToGhlPlaceholder() {
  return {
    ok: false,
    message: "Live GoHighLevel sync is intentionally disabled for Stage 14 Part 1."
  };
}
