import { DomainReputationCheck } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { writeAudit } from "@/lib/audit";
import { defaultDomainGuardId, getOrCreateDomainGuard } from "./domainReputationGuard";

export const liveSendingConfirmationPhrase = "ENABLE LIVE SENDING";

export type LiveSendingGateResult = {
  allowed: boolean;
  reasons: string[];
  checkedAt: Date;
};

export function evaluateLiveSendingGate(guard: DomainReputationCheck): LiveSendingGateResult {
  const reasons = [
    guard.simulationMode && "Simulation mode is still enabled.",
    !guard.dedicatedSendingDomain && "Dedicated sending domain is not confirmed.",
    !guard.spfConfigured && "SPF is not configured.",
    !guard.dkimConfigured && "DKIM is not configured.",
    !guard.dmarcConfigured && "DMARC is not configured.",
    !guard.businessAddressAdded && "Business address is not configured.",
    !guard.unsubscribeLinkEnabled && "Unsubscribe link is not enabled.",
    !guard.suppressionListActive && "Suppression list is not active.",
    !guard.emailVerificationEnabled && "Email verification is not active.",
    !guard.complianceChecksActive && "Compliance checks are not active.",
    (!guard.sendingLimitsConfigured || guard.dailyLimitPerInbox <= 0) && "Daily sending limit is not configured."
  ].filter(Boolean) as string[];

  return {
    allowed: reasons.length === 0 && guard.liveSendingAllowed,
    reasons,
    checkedAt: new Date()
  };
}

export async function checkLiveSendingGate({ audit = true }: { audit?: boolean } = {}) {
  const guard = await getOrCreateDomainGuard();
  const result = evaluateLiveSendingGate(guard);
  const blockReason = result.reasons.join(" ");

  await prisma.domainReputationCheck.update({
    where: { id: guard.id },
    data: {
      lastGateCheckAt: result.checkedAt,
      lastGateBlockReason: blockReason || null,
      liveSendingAllowed: result.allowed ? guard.liveSendingAllowed : false
    }
  });

  if (!result.allowed && audit) {
    await writeAudit("Live sending blocked", "DomainReputationCheck", guard.id, blockReason || "Live sending has not been enabled.");
  }

  return {
    ...result,
    allowed: result.allowed,
    guard: { ...guard, lastGateCheckAt: result.checkedAt, lastGateBlockReason: blockReason || null, liveSendingAllowed: result.allowed ? guard.liveSendingAllowed : false }
  };
}

export async function enableLiveSendingGate(confirmation: string, enabledBy = "Manual user") {
  const guard = await getOrCreateDomainGuard();
  const evaluated = evaluateLiveSendingGate({ ...guard, liveSendingAllowed: true });

  if (confirmation !== liveSendingConfirmationPhrase) {
    const reason = "Confirmation phrase did not match.";
    await prisma.domainReputationCheck.update({
      where: { id: guard.id },
      data: { liveSendingAllowed: false, lastGateCheckAt: new Date(), lastGateBlockReason: reason }
    });
    await writeAudit("Live sending blocked", "DomainReputationCheck", guard.id, reason);
    return { allowed: false, reasons: [reason] };
  }

  if (evaluated.reasons.length) {
    const reason = evaluated.reasons.join(" ");
    await prisma.domainReputationCheck.update({
      where: { id: guard.id },
      data: { liveSendingAllowed: false, lastGateCheckAt: new Date(), lastGateBlockReason: reason }
    });
    await writeAudit("Live sending blocked", "DomainReputationCheck", guard.id, reason);
    return { allowed: false, reasons: evaluated.reasons };
  }

  await prisma.domainReputationCheck.update({
    where: { id: defaultDomainGuardId },
    data: {
      liveSendingAllowed: true,
      liveSendingEnabledAt: new Date(),
      liveSendingEnabledBy: enabledBy,
      lastGateCheckAt: new Date(),
      lastGateBlockReason: null
    }
  });
  await writeAudit("Live sending enabled", "DomainReputationCheck", defaultDomainGuardId, "Live sending gate enabled after manual confirmation", { enabledBy });
  return { allowed: true, reasons: [] };
}

export async function disableLiveSendingGate(reason = "Disabled manually.") {
  await prisma.domainReputationCheck.update({
    where: { id: defaultDomainGuardId },
    data: {
      liveSendingAllowed: false,
      liveSendingEnabledAt: null,
      liveSendingEnabledBy: null,
      lastGateCheckAt: new Date(),
      lastGateBlockReason: reason
    }
  });
  await writeAudit("Live sending disabled", "DomainReputationCheck", defaultDomainGuardId, reason);
}
