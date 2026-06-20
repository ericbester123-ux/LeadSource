import { prisma } from "@/lib/prisma";
import { defaultSendingWindow, SendingQueueItemWithInclude } from "@/lib/sending-queue";
import { validateRenderedEmail } from "./emailRenderService";
import { hasSmtpCredentials } from "./smtpEmailProvider";
import { checkLiveSendingGate } from "@/lib/domain-guard/liveSendingGate";

export type SafetyResult = {
  ok: boolean;
  reasons: string[];
  auditAction?: string;
};

export function isWithinSendingWindow(date: Date, start = defaultSendingWindow.start, end = defaultSendingWindow.end) {
  const day = date.getDay();
  if (day === 0 || day === 6) return false;

  const [startHour, startMinute] = start.split(":").map(Number);
  const [endHour, endMinute] = end.split(":").map(Number);
  const current = date.getHours() * 60 + date.getMinutes();
  return current >= startHour * 60 + startMinute && current <= endHour * 60 + endMinute;
}

export function isToday(date: Date) {
  const now = new Date();
  return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth() && date.getDate() === now.getDate();
}

export async function getDailyLimitRemaining(inboxId?: string | null, dailyLimit = defaultSendingWindow.dailyLimit) {
  const today = new Date();
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const sentToday = await prisma.emailSendLog.count({
    where: {
      inboxId,
      status: { in: ["Simulated", "Sent"] },
      sentAt: { gte: startOfToday }
    }
  });
  return Math.max(0, dailyLimit - sentToday);
}

export async function checkQueueItemSafety(item: SendingQueueItemWithInclude): Promise<SafetyResult> {
  const reasons: string[] = [];
  const lead = item.lead;
  const verification = lead.emailVerification?.status ?? "Not Checked";
  const compliance = lead.complianceCheck?.status ?? "Pending Review";
  const rendered = validateRenderedEmail(item.subject, item.body);

  const latestReply = [...lead.replies].sort((a, b) => b.repliedAt.getTime() - a.repliedAt.getTime())[0];
  const outOfOfficeRescheduled = latestReply?.replyStatus === "Out of Office" && lead.nextFollowUpAt ? lead.nextFollowUpAt <= new Date() : false;

  if (lead.doNotContact) reasons.push("Lead is marked do-not-contact.");
  if (lead.unsubscribed) reasons.push("Lead is unsubscribed.");
  if (lead.bounced) reasons.push("Lead has bounced.");
  if (["Interested", "Booked Appointment", "Not Interested", "Unsubscribed", "Do Not Contact", "Suppressed", "Bounced"].includes(lead.status)) reasons.push(`Lead status stops sending: ${lead.status}.`);
  if (latestReply && !outOfOfficeRescheduled) reasons.push(`Lead has a reply status that stops follow-up: ${latestReply.replyStatus}.`);
  if (lead.bookings.length > 0) reasons.push("Lead has a booking; follow-ups must stop.");
  if (item.campaign.mode === "Paused") reasons.push(item.campaign.pauseReason ?? "Campaign is paused.");
  if (verification === "Invalid") reasons.push("Email verification is invalid.");
  if (["Risky", "Unknown", "Catch-All", "Not Checked"].includes(verification) && !lead.emailVerification?.manuallyApproved) {
    reasons.push(`Email verification requires manual approval: ${verification}.`);
  }
  if (compliance !== "Passed") reasons.push(`Compliance check required before sending: ${compliance}.`);
  if ((lead.leadScore?.score ?? 0) < item.campaign.minimumLeadScore && !lead.manuallyApproved) {
    reasons.push(`Lead score is below campaign minimum ${item.campaign.minimumLeadScore}.`);
  }
  if (!rendered.ok) reasons.push(...rendered.errors);
  if (!rendered.hasSender) reasons.push("Sender identity is missing.");
  if (!rendered.hasAgency) reasons.push("Agency name is missing.");
  if (!rendered.hasWebsite) reasons.push("Website URL is missing.");
  if (process.env.SIMULATE_EMAIL_SENDING === "false" && lead.country === "United States" && !rendered.hasBusinessAddress) reasons.push("Business address is missing for US outreach.");

  const suppressed = await prisma.suppressionListEntry.findUnique({ where: { email: item.recipientEmail } });
  if (suppressed) reasons.push(`Suppression list match: ${suppressed.reason}.`);

  let auditAction = "Email blocked by compliance";
  if (reasons.some((reason) => reason.toLowerCase().includes("suppression") || reason.toLowerCase().includes("unsubscribed"))) auditAction = "Email blocked by suppression";
  if (reasons.some((reason) => reason.toLowerCase().includes("verification"))) auditAction = "Email blocked by verification";

  return { ok: reasons.length === 0, reasons, auditAction };
}

export async function checkLiveSendingSafety(): Promise<SafetyResult> {
  const reasons: string[] = [];

  if (process.env.SIMULATE_EMAIL_SENDING !== "false") reasons.push("Simulation mode is still enabled.");
  if (!process.env.SMTP_FROM_NAME) reasons.push("Sender name is not configured.");
  if (!process.env.SMTP_FROM_EMAIL) reasons.push("Sender email is not configured.");
  if (!hasSmtpCredentials() && (process.env.EMAIL_PROVIDER ?? "smtp").toLowerCase() === "smtp") reasons.push("SMTP credentials are not fully configured.");

  const gate = await checkLiveSendingGate({ audit: true });
  if (!gate.allowed) reasons.push(...gate.reasons);

  return { ok: reasons.length === 0, reasons, auditAction: "Queue item blocked by live sending gate" };
}
