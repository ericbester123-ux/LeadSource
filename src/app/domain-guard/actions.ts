"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { writeAudit } from "@/lib/audit";
import { applyCampaignProtection, defaultDomainGuardId, getOrCreateDomainGuard } from "@/lib/domain-guard/domainReputationGuard";
import { checkLiveSendingGate, disableLiveSendingGate, enableLiveSendingGate } from "@/lib/domain-guard/liveSendingGate";

function bool(formData: FormData, key: string) {
  return formData.get(key) === "on";
}

function value(formData: FormData, key: string) {
  const raw = formData.get(key);
  return typeof raw === "string" ? raw.trim() : "";
}

function numberValue(formData: FormData, key: string, fallback: number) {
  const parsed = Number(value(formData, key));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function percentValue(formData: FormData, key: string, fallback: number) {
  const parsed = Number(value(formData, key));
  if (!Number.isFinite(parsed) || parsed < 0) return fallback;
  return parsed / 100;
}

export async function updateDomainChecklistAction(formData: FormData) {
  const current = await getOrCreateDomainGuard();
  const sendingDomain = value(formData, "sendingDomain") || current.sendingDomain;
  const dailyLimitPerInbox = numberValue(formData, "dailyLimitPerInbox", current.dailyLimitPerInbox);
  const sendingDays = value(formData, "sendingDays");
  const sendingWindowStart = value(formData, "sendingWindowStart");
  const sendingWindowEnd = value(formData, "sendingWindowEnd");
  const warmupMode = bool(formData, "warmupMode");
  const simulationMode = bool(formData, "simulationMode");
  const bounceThreshold = percentValue(formData, "bounceThreshold", current.bounceThreshold);
  const unsubscribeThreshold = percentValue(formData, "unsubscribeThreshold", current.unsubscribeThreshold);
  const complaintThreshold = percentValue(formData, "complaintThreshold", current.complaintThreshold);

  const data = {
    sendingDomain,
    dedicatedSendingDomain: bool(formData, "dedicatedSendingDomain"),
    spfConfigured: bool(formData, "spfConfigured"),
    dkimConfigured: bool(formData, "dkimConfigured"),
    dmarcConfigured: bool(formData, "dmarcConfigured"),
    customTrackingDomainConfigured: bool(formData, "customTrackingDomainConfigured"),
    businessAddressAdded: bool(formData, "businessAddressAdded"),
    unsubscribeLinkEnabled: bool(formData, "unsubscribeLinkEnabled"),
    suppressionListActive: bool(formData, "suppressionListActive"),
    emailVerificationEnabled: bool(formData, "emailVerificationEnabled"),
    complianceChecksActive: bool(formData, "complianceChecksActive"),
    sendingLimitsConfigured: bool(formData, "sendingLimitsConfigured"),
    dailyLimitPerInbox,
    sendingDays,
    sendingWindowStart,
    sendingWindowEnd,
    warmupMode,
    simulationMode,
    bounceThreshold,
    unsubscribeThreshold,
    complaintThreshold,
    liveSendingAllowed: false,
    liveSendingEnabledAt: null,
    liveSendingEnabledBy: null,
    status: "Needs Review"
  };

  await prisma.domainReputationCheck.update({
    where: { id: defaultDomainGuardId },
    data
  });

  await prisma.settings.upsert({
    where: { key: "default_safety_settings" },
    update: {
      simulateEmailSending: simulationMode,
      dailyLimitPerInbox,
      emailVerificationRequired: data.emailVerificationEnabled,
      complianceCheckRequired: data.complianceChecksActive,
      unsubscribeLinkRequired: data.unsubscribeLinkEnabled,
      suppressionListActive: data.suppressionListActive
    },
    create: {
      key: "default_safety_settings",
      value: "Conservative defaults with simulated sending enabled.",
      description: "LeadSource default safety controls.",
      simulateEmailSending: simulationMode,
      reviewRequired: true,
      dailyLimitPerInbox,
      emailVerificationRequired: data.emailVerificationEnabled,
      complianceCheckRequired: data.complianceChecksActive,
      unsubscribeLinkRequired: data.unsubscribeLinkEnabled,
      suppressionListActive: data.suppressionListActive
    }
  });

  await writeAudit("Domain checklist updated", "DomainReputationCheck", defaultDomainGuardId, "Domain Guard checklist updated", data);
  if (current.sendingDomain !== sendingDomain) await writeAudit("Sending domain updated", "DomainReputationCheck", defaultDomainGuardId, "Sending domain changed", { from: current.sendingDomain, to: sendingDomain });
  if (current.dailyLimitPerInbox !== dailyLimitPerInbox) await writeAudit("Sending limit changed", "DomainReputationCheck", defaultDomainGuardId, "Daily sending limit changed", { from: current.dailyLimitPerInbox, to: dailyLimitPerInbox });
  if (current.sendingDays !== sendingDays) await writeAudit("Sending days changed", "DomainReputationCheck", defaultDomainGuardId, "Sending days changed", { from: current.sendingDays, to: sendingDays });
  if (current.sendingWindowStart !== sendingWindowStart || current.sendingWindowEnd !== sendingWindowEnd) {
    await writeAudit("Sending window changed", "DomainReputationCheck", defaultDomainGuardId, "Sending window changed", {
      from: `${current.sendingWindowStart}-${current.sendingWindowEnd}`,
      to: `${sendingWindowStart}-${sendingWindowEnd}`
    });
  }
  if (current.warmupMode !== warmupMode) await writeAudit("Warm-up mode changed", "DomainReputationCheck", defaultDomainGuardId, "Warm-up mode changed", { from: current.warmupMode, to: warmupMode });
  if (current.simulationMode !== simulationMode) await writeAudit("Simulation mode changed", "DomainReputationCheck", defaultDomainGuardId, "Simulation mode changed", { from: current.simulationMode, to: simulationMode });
  if (current.bounceThreshold !== bounceThreshold) await writeAudit("Bounce threshold changed", "DomainReputationCheck", defaultDomainGuardId, "Bounce threshold changed", { from: current.bounceThreshold, to: bounceThreshold });
  if (current.unsubscribeThreshold !== unsubscribeThreshold) await writeAudit("Unsubscribe threshold changed", "DomainReputationCheck", defaultDomainGuardId, "Unsubscribe threshold changed", { from: current.unsubscribeThreshold, to: unsubscribeThreshold });
  if (current.complaintThreshold !== complaintThreshold) await writeAudit("Complaint threshold changed", "DomainReputationCheck", defaultDomainGuardId, "Complaint threshold changed", { from: current.complaintThreshold, to: complaintThreshold });

  await applyCampaignProtection();

  revalidatePath("/domain-guard");
  revalidatePath("/");
  revalidatePath("/dashboard");
  revalidatePath("/settings");
  revalidatePath("/campaigns");
  revalidatePath("/sending-queue");
}

export async function checkLiveSendingGateAction() {
  await checkLiveSendingGate({ audit: true });
  revalidatePath("/domain-guard");
  revalidatePath("/");
  revalidatePath("/dashboard");
}

export async function enableLiveSendingGateAction(formData: FormData) {
  await enableLiveSendingGate(value(formData, "confirmation"), value(formData, "enabledBy") || "Manual user");
  revalidatePath("/domain-guard");
  revalidatePath("/");
  revalidatePath("/dashboard");
}

export async function disableLiveSendingGateAction() {
  await disableLiveSendingGate();
  revalidatePath("/domain-guard");
  revalidatePath("/");
  revalidatePath("/dashboard");
}
