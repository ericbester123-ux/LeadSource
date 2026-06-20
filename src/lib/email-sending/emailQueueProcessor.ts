import { prisma } from "@/lib/prisma";
import { writeAudit } from "@/lib/audit";
import { defaultSendingWindow, sendingQueueInclude } from "@/lib/sending-queue";
import { getConfiguredProviderName, isSimulationMode } from "./emailProvider";
import { simulatedEmailProvider } from "./simulatedEmailProvider";
import { smtpEmailProvider } from "./smtpEmailProvider";
import { sendgridProviderPlaceholder } from "./sendgridProviderPlaceholder";
import { mailgunProviderPlaceholder } from "./mailgunProviderPlaceholder";
import { resendProviderPlaceholder } from "./resendProviderPlaceholder";
import { instantlyProviderPlaceholder } from "./instantlyProviderPlaceholder";
import { smartleadProviderPlaceholder } from "./smartleadProviderPlaceholder";
import { checkLiveSendingSafety, checkQueueItemSafety, getDailyLimitRemaining, isToday, isWithinSendingWindow } from "./emailSafetyCheckService";
import { applyCampaignProtection } from "@/lib/domain-guard/domainReputationGuard";

function getProvider() {
  if (isSimulationMode()) return simulatedEmailProvider;

  switch (getConfiguredProviderName()) {
    case "sendgrid":
      return sendgridProviderPlaceholder;
    case "mailgun":
      return mailgunProviderPlaceholder;
    case "resend":
      return resendProviderPlaceholder;
    case "instantly":
      return instantlyProviderPlaceholder;
    case "smartlead":
      return smartleadProviderPlaceholder;
    case "smtp":
    default:
      return smtpEmailProvider;
  }
}

async function logSendAttempt({
  item,
  provider,
  status,
  providerMessageId,
  errorMessage,
  metadata,
  sentAt
}: {
  item: Awaited<ReturnType<typeof getDueQueueItems>>[number];
  provider: string;
  status: "Simulated" | "Sent" | "Failed" | "Skipped" | "Blocked";
  providerMessageId?: string;
  errorMessage?: string;
  metadata?: Record<string, unknown>;
  sentAt?: Date;
}) {
  await prisma.emailSendLog.create({
    data: {
      leadId: item.leadId,
      campaignId: item.campaignId,
      campaignStepId: item.campaignStepId,
      sendingQueueItemId: item.id,
      inboxId: item.inboxId,
      provider,
      providerMessageId,
      recipientEmail: item.recipientEmail,
      subject: item.subject,
      body: item.body,
      status,
      simulated: provider === "simulation",
      failureReason: errorMessage,
      errorMessage,
      metadata: metadata ? JSON.stringify(metadata) : undefined,
      sentAt
    }
  });
}

async function getDueQueueItems() {
  return prisma.sendingQueueItem.findMany({
    where: {
      status: { in: ["Approved", "Scheduled"] },
      scheduledFor: { lte: new Date() }
    },
    include: sendingQueueInclude,
    orderBy: [{ scheduledFor: "asc" }, { createdAt: "asc" }]
  });
}

export async function processDueQueue() {
  await applyCampaignProtection();
  const provider = getProvider();
  const liveSafety = isSimulationMode() ? { ok: true, reasons: [] } : await checkLiveSendingSafety();
  const dueItems = await getDueQueueItems();
  const summary = { processed: 0, simulated: 0, sent: 0, failed: 0, skipped: 0, blocked: 0 };

  if (!liveSafety.ok) {
    for (const item of dueItems) {
      await prisma.sendingQueueItem.update({
        where: { id: item.id },
        data: { status: "Blocked", skippedReason: liveSafety.reasons.join(" "), skipReason: liveSafety.reasons.join(" ") }
      });
      await logSendAttempt({
        item,
        provider: provider.name,
        status: "Blocked",
        errorMessage: liveSafety.reasons.join(" "),
        metadata: { liveSendingWarning: true }
      });
      await writeAudit(liveSafety.reasons.some((reason) => reason.includes("Simulation mode")) ? "Live sending blocked" : "Queue item blocked by live sending gate", "SendingQueueItem", item.id, liveSafety.reasons.join(" "));
      summary.blocked += 1;
    }
    return summary;
  }

  for (const item of dueItems) {
    summary.processed += 1;

    if (item.scheduledFor && !isToday(item.scheduledFor)) continue;

    const windowStart = item.campaign.sendingWindowStart || defaultSendingWindow.start;
    const windowEnd = item.campaign.sendingWindowEnd || defaultSendingWindow.end;
    if (!isSimulationMode() && item.scheduledFor && !isWithinSendingWindow(item.scheduledFor, windowStart, windowEnd)) {
      const reason = `Outside sending window ${windowStart}-${windowEnd}.`;
      await prisma.sendingQueueItem.update({ where: { id: item.id }, data: { status: "Skipped", skippedReason: reason, skipReason: reason } });
      await logSendAttempt({ item, provider: provider.name, status: "Blocked", errorMessage: reason });
      await writeAudit("Email blocked by sending window", "SendingQueueItem", item.id, reason);
      summary.blocked += 1;
      continue;
    }

    const dailyLimit = item.inbox?.dailyLimit ?? item.campaign.maxEmailsSentPerDay ?? defaultSendingWindow.dailyLimit;
    const remaining = await getDailyLimitRemaining(item.inboxId, dailyLimit);
    if (!isSimulationMode() && remaining <= 0) {
      const reason = "Daily sending limit reached.";
      await prisma.sendingQueueItem.update({ where: { id: item.id }, data: { status: "Skipped", skippedReason: reason, skipReason: reason } });
      await logSendAttempt({ item, provider: provider.name, status: "Blocked", errorMessage: reason, metadata: { dailyLimit } });
      await writeAudit("Email blocked by daily limit", "SendingQueueItem", item.id, reason, { dailyLimit });
      summary.blocked += 1;
      continue;
    }

    const safety = await checkQueueItemSafety(item);
    if (!safety.ok) {
      const reason = safety.reasons.join(" ");
      await prisma.sendingQueueItem.update({ where: { id: item.id }, data: { status: "Skipped", skippedReason: reason, skipReason: reason } });
      await logSendAttempt({ item, provider: provider.name, status: "Blocked", errorMessage: reason });
      await writeAudit(safety.auditAction ?? "Email blocked by compliance", "SendingQueueItem", item.id, reason);
      summary.blocked += 1;
      continue;
    }

    const result = await provider.send({
      to: item.recipientEmail,
      subject: item.subject,
      body: item.body,
      fromEmail: item.inbox?.email ?? process.env.SMTP_FROM_EMAIL,
      fromName: item.inbox?.fromName ?? process.env.SMTP_FROM_NAME,
      metadata: { queueItemId: item.id, campaignId: item.campaignId, leadId: item.leadId }
    });

    if (result.ok) {
      const sentAt = new Date();
      await prisma.sendingQueueItem.update({
        where: { id: item.id },
        data: {
          status: "Sent",
          sentAt,
          providerMessageId: result.providerMessageId,
          failureReason: null
        }
      });
      await logSendAttempt({
        item,
        provider: result.provider,
        status: isSimulationMode() ? "Simulated" : "Sent",
        providerMessageId: result.providerMessageId,
        metadata: result.metadata,
        sentAt
      });
      await writeAudit(isSimulationMode() ? "Email sent simulated" : "Email sent", "SendingQueueItem", item.id, isSimulationMode() ? "Queue item processed in simulation mode" : "Queue item sent by provider", {
        provider: result.provider,
        recipientEmail: item.recipientEmail
      });
      if (isSimulationMode()) summary.simulated += 1;
      else summary.sent += 1;
      continue;
    }

    await prisma.sendingQueueItem.update({
      where: { id: item.id },
      data: {
        status: "Failed",
        failureReason: result.errorMessage ?? "Provider send failed.",
        retryCount: { increment: 1 }
      }
    });
    await logSendAttempt({
      item,
      provider: result.provider,
      status: "Failed",
      errorMessage: result.errorMessage,
      metadata: result.metadata
    });
    await writeAudit("Email failed", "SendingQueueItem", item.id, result.errorMessage ?? "Provider send failed.", { provider: result.provider });
    summary.failed += 1;
  }

  return summary;
}
