import { prisma } from "@/lib/prisma";
import { writeAudit } from "@/lib/audit";
import { buildGhlContactPayload, ghlLeadInclude } from "./ghlContactMapper";
import { buildGhlOpportunityPayload } from "./ghlOpportunityMapper";
import { validateGhlConfig } from "./ghlConfigValidator";

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

  const suppressed = await prisma.suppressionListEntry.findUnique({ where: { email: lead.email } });
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
    previewMode: validateGhlConfig().mode === "Preview Mode"
  });
  return { ok: true, issues: [] };
}

async function getManualSyncIssues(leadId: string, force?: boolean) {
  const issues = await getGhlPreparationIssues(leadId);
  if (force) return issues.filter((issue) => issue !== "Lead status is not Interested or Booked Appointment.");
  return issues;
}

export async function createOrUpdateGhlContact(payload: Awaited<ReturnType<typeof buildGhlPayload>>["contact"]) {
  return {
    ok: true,
    provider: "ghl",
    ghlContactId: `ghl_contact_${Buffer.from(payload.email).toString("base64url").slice(0, 18)}`,
    response: {
      livePlaceholder: true,
      operation: "createOrUpdateContact",
      email: payload.email,
      companyName: payload.companyName
    }
  };
}

export async function createOrUpdateGhlOpportunity(payload: Awaited<ReturnType<typeof buildGhlPayload>>["opportunity"], contactId: string) {
  return {
    ok: true,
    provider: "ghl",
    ghlOpportunityId: `ghl_opp_${Buffer.from(`${contactId}:${payload.name}`).toString("base64url").slice(0, 18)}`,
    response: {
      livePlaceholder: true,
      operation: "createOrUpdateOpportunity",
      contactId,
      pipelineId: payload.pipelineId,
      pipelineStageId: payload.pipelineStageId
    }
  };
}

export async function syncLeadToGhl(leadId: string, options: GhlSyncOptions = {}) {
  const config = validateGhlConfig();
  const payload = await buildGhlPayload(leadId);
  const issues = await getManualSyncIssues(leadId, options.force);
  const source = options.source ?? "manual";

  await writeAudit(source === "retry" ? "GHL sync retried" : "GHL sync attempted", "Lead", leadId, `GHL sync attempt started in ${config.mode}`, {
    configured: config.configured,
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

  if (!config.configured) {
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
    await writeAudit("Lead prepared for GHL", "Lead", leadId, "GHL credentials missing; lead remains Ready for GHL in Preview Mode", { logId: log.id });
    return { ok: true, mode: config.mode, status: "Ready for GHL", payload, log };
  }

  try {
    const contact = await createOrUpdateGhlContact(payload.contact);
    const opportunity = payload.opportunity.pipelineId ? await createOrUpdateGhlOpportunity(payload.opportunity, contact.ghlContactId) : null;
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
    include: { campaignEnrollments: { include: { campaign: true } } }
  });
  const campaign = lead?.campaignEnrollments[0]?.campaign;
  const autoEnabled = trigger === "Interested" ? campaign?.syncInterestedLeadsToGhl : campaign?.syncBookedLeadsToGhl;

  if (!lead || !autoEnabled) {
    await writeAudit("Auto-sync skipped", "Lead", leadId, "Auto-sync not enabled for this lead or campaign", { trigger });
    return { ok: false, skipped: true };
  }

  if (!validateGhlConfig().configured) {
    await writeAudit("Auto-sync skipped", "Lead", leadId, "GHL credentials are missing; lead left Ready for GHL", { trigger });
    return { ok: false, skipped: true };
  }

  const result = await syncLeadToGhl(leadId, { source: "auto" });
  await writeAudit("Auto-sync completed", "Lead", leadId, "Auto-sync attempted after reply", { trigger, status: result.status });
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
