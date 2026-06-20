"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { writeAudit } from "@/lib/audit";
import { hasRequiredIdentity, renderTemplate } from "@/lib/email-render";
import { processDueQueue } from "@/lib/email-sending/emailQueueProcessor";
import { applyCampaignProtection } from "@/lib/domain-guard/domainReputationGuard";
import { isValidEmail } from "@/lib/lead-utils";
import type { QueueBlockCategory, QueueGenerationBlockedLead, QueueGenerationState } from "./state";
import { emptyQueueGenerationState } from "./state";

function values(formData: FormData, key: string) {
  return formData.getAll(key).filter((value): value is string => typeof value === "string" && Boolean(value));
}

function value(formData: FormData, key: string) {
  const raw = formData.get(key);
  return typeof raw === "string" && raw.trim() ? raw.trim() : undefined;
}

function addBusinessDays(date: Date, days: number) {
  const next = new Date(date);
  let remaining = days;
  while (remaining > 0) {
    next.setDate(next.getDate() + 1);
    const day = next.getDay();
    if (day !== 0 && day !== 6) remaining -= 1;
  }
  return next;
}

function randomScheduledTime(baseDate: Date, index: number) {
  const scheduled = new Date(baseDate);
  const startMinutes = 9 * 60;
  const endMinutes = 15 * 60 + 30;
  const spread = Math.max(1, endMinutes - startMinutes);
  const minute = startMinutes + ((index * 23 + Math.floor(Math.random() * 17)) % spread);
  scheduled.setHours(Math.floor(minute / 60), minute % 60, 0, 0);
  return scheduled;
}

async function blockQueue(reason: string, auditAction: string, entityId: string | undefined, metadata: unknown) {
  await writeAudit(auditAction, "SendingQueueItem", entityId, reason, metadata);
}

function categoryForReason(reason: string): QueueBlockCategory {
  const lower = reason.toLowerCase();
  if (lower.includes("already queued")) return "alreadyQueuedSkipped";
  if (lower.includes("missing email")) return "missingEmail";
  if (lower.includes("invalid email") || lower.includes("email is invalid")) return "invalidEmail";
  if (lower.includes("verification")) return "verificationStatus";
  if (lower.includes("compliance")) return "complianceStatus";
  if (lower.includes("suppression")) return "suppression";
  if (lower.includes("do-not-contact") || lower.includes("do not contact")) return "doNotContact";
  if (lower.includes("unsubscribed")) return "unsubscribed";
  if (lower.includes("bounced")) return "bounced";
  if (lower.includes("score")) return "lowScore";
  if (lower.includes("campaign step") || lower.includes("template") || lower.includes("subject") || lower.includes("body")) return "missingTemplate";
  if (lower.includes("reply") || lower.includes("booking") || lower.includes("follow-up") || lower.includes("not interested") || lower.includes("not due") || lower.includes("stops")) return "stopRule";
  return "otherErrors";
}

function increment(summary: QueueGenerationState, category: QueueBlockCategory) {
  summary[category] += 1;
}

function addBlockedLead(summary: QueueGenerationState, enrollment: Awaited<ReturnType<typeof getApprovedEnrollments>>[number], reason: string, stepNumber?: number) {
  const category = categoryForReason(reason);
  increment(summary, category);
  summary.blockedLeads.push({
    leadId: enrollment.leadId,
    leadName: enrollment.lead.companyName,
    email: enrollment.lead.email,
    campaignName: enrollment.campaign.name,
    stepNumber,
    category,
    reason
  });
}

async function checkQueueEligibility(enrollment: Awaited<ReturnType<typeof getApprovedEnrollments>>[number]) {
  const lead = enrollment.lead;
  const campaign = enrollment.campaign;
  const reasons: string[] = [];

  const latestReply = [...lead.replies].sort((a, b) => b.repliedAt.getTime() - a.repliedAt.getTime())[0];
  const outOfOfficeRescheduled = latestReply?.replyStatus === "Out of Office" && lead.nextFollowUpAt ? lead.nextFollowUpAt <= new Date() : false;

  if (!lead.email) reasons.push("Lead is missing email.");
  if (lead.email && !isValidEmail(lead.email)) reasons.push("Lead has invalid email.");
  if (lead.doNotContact) reasons.push("Lead is marked do-not-contact.");
  if (lead.unsubscribed) reasons.push("Lead is unsubscribed.");
  if (lead.bounced) reasons.push("Lead has bounced.");
  if (["Interested", "Booked Appointment", "Not Interested", "Do Not Contact", "Unsubscribed", "Suppressed", "Bounced"].includes(lead.status)) reasons.push(`Lead status stops follow-up: ${lead.status}.`);
  if (latestReply && !outOfOfficeRescheduled) reasons.push(`Lead has a reply status that stops follow-up: ${latestReply.replyStatus}.`);
  if (lead.bookings.length > 0) reasons.push("Lead has a booking.");
  if (campaign.mode === "Paused") reasons.push(campaign.pauseReason ?? "Campaign is paused.");

  const verification = lead.emailVerification?.status ?? "Not Checked";
  if (verification === "Invalid") reasons.push("Email verification is invalid.");
  if (["Risky", "Unknown", "Catch-All", "Not Checked"].includes(verification) && !lead.emailVerification?.manuallyApproved) {
    reasons.push(`Email verification requires manual approval: ${verification}.`);
  }

  const compliance = lead.complianceCheck?.status ?? "Pending Review";
  if (compliance !== "Passed") reasons.push(`Compliance check required before sending: ${compliance}.`);

  const suppressed = await prisma.suppressionListEntry.findUnique({ where: { email: lead.email } });
  if (suppressed) reasons.push(`Suppression list match: ${suppressed.reason}.`);

  const score = lead.leadScore?.score ?? 0;
  if (score < campaign.minimumLeadScore && !lead.manuallyApproved) {
    reasons.push(`Lead score ${score} is below campaign minimum ${campaign.minimumLeadScore}.`);
  }

  return reasons;
}

async function getApprovedEnrollments() {
  return prisma.campaignEnrollment.findMany({
    where: {
      status: { in: ["Approved", "Ready for Review"] }
    },
    include: {
      campaign: {
        include: {
          steps: { orderBy: { stepNumber: "asc" } },
          templates: true
        }
      },
      lead: {
        include: {
          emailVerification: true,
          leadScore: true,
          complianceCheck: true,
          replies: true,
          bookings: true,
          emailSendLogs: {
            include: {
              campaignStep: true
            }
          },
          sendingQueueItems: true
        }
      }
    }
  });
}

function nextDueStep(enrollment: Awaited<ReturnType<typeof getApprovedEnrollments>>[number]) {
  const sentLogs = enrollment.lead.emailSendLogs
    .filter((log) => log.campaignId === enrollment.campaignId && ["Simulated", "Sent"].includes(log.status))
    .sort((a, b) => (a.campaignStep?.stepNumber ?? 0) - (b.campaignStep?.stepNumber ?? 0));
  const lastSent = sentLogs.at(-1);
  if (!lastSent) return { step: enrollment.campaign.steps[0], reason: undefined };

  const lastStepNumber = lastSent.campaignStep?.stepNumber ?? 0;
  const step = enrollment.campaign.steps.find((item) => item.stepNumber > lastStepNumber);
  if (!step) return { step: undefined, reason: "No next campaign step is available." };

  if (lastSent.sentAt) {
    const dueAt = addBusinessDays(lastSent.sentAt, step.delayDays);
    if (dueAt > new Date()) return { step: undefined, reason: `Next follow-up step ${step.stepNumber} is not due until ${dueAt.toISOString().slice(0, 10)}.` };
  }

  return { step, reason: undefined };
}

export async function generateQueueFromApprovedEnrollments(_prev: QueueGenerationState, _formData: FormData): Promise<QueueGenerationState> {
  await applyCampaignProtection();
  const enrollments = await getApprovedEnrollments();
  const inbox = await prisma.sendingInbox.findFirst({ where: { isActive: true }, orderBy: { createdAt: "asc" } });
  const summary: QueueGenerationState = {
    ...emptyQueueGenerationState,
    ran: true,
    enrollmentsChecked: enrollments.length,
    blockedLeads: []
  };

  await writeAudit("Queue generation started", "SendingQueueItem", undefined, "Generate queue started", {
    enrollmentsChecked: enrollments.length
  });

  for (const enrollment of enrollments) {
    try {
      const { step, reason: stepReason } = nextDueStep(enrollment);
      if (!step) {
        const reason = stepReason ?? "Missing campaign step or email template.";
        summary.skipped += 1;
        addBlockedLead(summary, enrollment, reason);
        await blockQueue(reason, "Queue item blocked with reason", undefined, { leadId: enrollment.leadId, campaignId: enrollment.campaignId });
        continue;
      }

      const duplicate = enrollment.lead.sendingQueueItems.find((item) => item.campaignId === enrollment.campaignId && item.stepNumber === step.stepNumber);
      if (duplicate) {
        const reason = `Already queued for campaign step ${step.stepNumber}.`;
        summary.skipped += 1;
        addBlockedLead(summary, enrollment, reason, step.stepNumber);
        await blockQueue(reason, "Queue item skipped duplicate", duplicate.id, { leadId: enrollment.leadId, campaignId: enrollment.campaignId, stepNumber: step.stepNumber });
        continue;
      }

      const template = enrollment.campaign.templates.find((item) => item.stepNumber === step.stepNumber);
      if (!template && (!step.subject || !step.body)) {
        const reason = `Missing campaign step/template content for step ${step.stepNumber}.`;
        summary.skipped += 1;
        addBlockedLead(summary, enrollment, reason, step.stepNumber);
        await blockQueue(reason, "Queue item blocked with reason", undefined, { leadId: enrollment.leadId, campaignId: enrollment.campaignId, stepNumber: step.stepNumber });
        continue;
      }

      const blockReasons = await checkQueueEligibility(enrollment);
      if (blockReasons.length) {
        summary.skipped += 1;
        for (const reason of blockReasons) addBlockedLead(summary, enrollment, reason, step.stepNumber);
        const joined = blockReasons.join(" ");
        const action = joined.includes("Suppression") ? "Email blocked by suppression" : joined.includes("verification") ? "Email blocked by verification" : "Queue item blocked with reason";
        await blockQueue(joined, action, undefined, { leadId: enrollment.leadId, campaignId: enrollment.campaignId, stepNumber: step.stepNumber });
        continue;
      }

      const subject = renderTemplate(template?.subject ?? step.subject, enrollment.lead);
      const body = renderTemplate(template?.body ?? step.body, enrollment.lead);
      const identity = hasRequiredIdentity(body);
      const identityWarnings = [
        !identity.hasUnsubscribe && "Unsubscribe link is missing.",
        !identity.hasSender && "Sender identity is missing.",
        !identity.hasAgency && "Agency name is missing.",
        !identity.hasWebsite && "Website URL is missing.",
        process.env.SIMULATE_EMAIL_SENDING === "false" && enrollment.lead.country === "United States" && !identity.hasBusinessAddress && "Business address is missing for US outreach."
      ].filter(Boolean) as string[];

      if (identityWarnings.length) {
        summary.skipped += 1;
        for (const reason of identityWarnings) addBlockedLead(summary, enrollment, reason, step.stepNumber);
        await blockQueue(identityWarnings.join(" "), "Queue item blocked with reason", undefined, {
          leadId: enrollment.leadId,
          campaignId: enrollment.campaignId,
          stepNumber: step.stepNumber
        });
        continue;
      }

      const scheduledBase = addBusinessDays(new Date(), step.delayDays);
      const scheduledFor = randomScheduledTime(scheduledBase, summary.created);
      const created = await prisma.sendingQueueItem.create({
        data: {
          leadId: enrollment.leadId,
          campaignId: enrollment.campaignId,
          campaignStepId: step.id,
          emailTemplateId: template?.id,
          inboxId: inbox?.id,
          stepNumber: step.stepNumber,
          recipientEmail: enrollment.lead.email,
          subject,
          body,
          status: "Ready for Review",
          scheduledFor
        }
      });
      summary.created += 1;
      await writeAudit("Queue item created", "SendingQueueItem", created.id, "Email added to queue for review", {
        leadId: enrollment.leadId,
        campaignId: enrollment.campaignId,
        stepNumber: step.stepNumber,
        simulated: process.env.SIMULATE_EMAIL_SENDING !== "false"
      });
    } catch (error) {
      const reason = error instanceof Error ? error.message : "Unknown queue generation error.";
      summary.skipped += 1;
      addBlockedLead(summary, enrollment, reason);
      await blockQueue(reason, "Queue item blocked with reason", undefined, { leadId: enrollment.leadId, campaignId: enrollment.campaignId });
      continue;
    }
  }

  summary.message = `${summary.created} queue items created. ${summary.skipped} enrollments skipped or blocked.`;
  await writeAudit("Queue generation completed", "SendingQueueItem", undefined, summary.message, {
    enrollmentsChecked: summary.enrollmentsChecked,
    created: summary.created,
    skipped: summary.skipped,
    alreadyQueuedSkipped: summary.alreadyQueuedSkipped,
    missingEmail: summary.missingEmail,
    invalidEmail: summary.invalidEmail,
    verificationStatus: summary.verificationStatus,
    complianceStatus: summary.complianceStatus,
    suppression: summary.suppression,
    doNotContact: summary.doNotContact,
    unsubscribed: summary.unsubscribed,
    bounced: summary.bounced,
    lowScore: summary.lowScore,
    missingTemplate: summary.missingTemplate,
    stopRule: summary.stopRule,
    otherErrors: summary.otherErrors
  });

  revalidatePath("/sending-queue");
  return summary;
}

export async function approveQueueItems(formData: FormData) {
  const ids = values(formData, "queueIds");
  await prisma.sendingQueueItem.updateMany({ where: { id: { in: ids } }, data: { status: "Approved", approvedAt: new Date() } });
  await writeAudit("Email approved", "SendingQueueItem", undefined, "Queue items approved", { ids });
  revalidatePath("/sending-queue");
}

export async function skipQueueItems(formData: FormData) {
  const ids = values(formData, "queueIds");
  const reason = value(formData, "reason") ?? "Skipped manually.";
  await prisma.sendingQueueItem.updateMany({ where: { id: { in: ids } }, data: { status: "Skipped", skippedReason: reason, skipReason: reason } });
  await writeAudit("Email skipped", "SendingQueueItem", undefined, reason, { ids });
  revalidatePath("/sending-queue");
}

export async function stopQueueItems(formData: FormData) {
  const ids = values(formData, "queueIds");
  const reason = value(formData, "reason") ?? "Stopped manually.";
  await prisma.sendingQueueItem.updateMany({ where: { id: { in: ids } }, data: { status: "Stopped", skippedReason: reason, skipReason: reason } });
  await writeAudit("Email stopped", "SendingQueueItem", undefined, reason, { ids });
  revalidatePath("/sending-queue");
}

export async function rescheduleQueueItem(formData: FormData) {
  const id = value(formData, "queueId");
  const scheduledFor = value(formData, "scheduledFor");
  if (!id || !scheduledFor) return;
  await prisma.sendingQueueItem.update({
    where: { id },
    data: { scheduledFor: new Date(scheduledFor), status: "Scheduled" }
  });
  await writeAudit("Email scheduled", "SendingQueueItem", id, "Queue item rescheduled", { scheduledFor });
  revalidatePath("/sending-queue");
}

export async function processDueQueueSimulation() {
  await processDueQueue();
  const inboxes = await prisma.sendingInbox.findMany({ where: { isActive: true } });
  for (const inbox of inboxes) {
    if (inbox.dailyLimit > 50) {
      await writeAudit("Sending limit changed", "SendingInbox", inbox.id, "Warning: daily limit above 50", { dailyLimit: inbox.dailyLimit });
    }
  }

  revalidatePath("/sending-queue");
}
