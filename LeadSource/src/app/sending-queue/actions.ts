"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { writeAudit } from "@/lib/audit";
import { hasRequiredIdentity, renderTemplate } from "@/lib/email-render";
import { processDueQueue } from "@/lib/email-sending/emailQueueProcessor";
import { applyCampaignProtection } from "@/lib/domain-guard/domainReputationGuard";

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

async function checkQueueEligibility(enrollment: Awaited<ReturnType<typeof getApprovedEnrollments>>[number]) {
  const lead = enrollment.lead;
  const campaign = enrollment.campaign;
  const reasons: string[] = [];

  const latestReply = [...lead.replies].sort((a, b) => b.repliedAt.getTime() - a.repliedAt.getTime())[0];
  const outOfOfficeRescheduled = latestReply?.replyStatus === "Out of Office" && lead.nextFollowUpAt ? lead.nextFollowUpAt <= new Date() : false;

  if (lead.doNotContact) reasons.push("Lead is marked do-not-contact.");
  if (!lead.email) reasons.push("Lead email is missing.");
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

  const suppressed = lead.email ? await prisma.suppressionListEntry.findUnique({ where: { email: lead.email } }) : null;
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
      status: { in: ["Approved", "Ready for Review"] },
      lead: { status: { in: ["Approved", "Ready for Review", "Verified", "Compliance Passed", "Scored"] } }
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
          bookings: true
        }
      }
    }
  });
}

export async function generateQueueFromApprovedEnrollments() {
  await applyCampaignProtection();
  const enrollments = await getApprovedEnrollments();
  const inbox = await prisma.sendingInbox.findFirst({ where: { isActive: true }, orderBy: { createdAt: "asc" } });
  let queued = 0;

  for (const enrollment of enrollments) {
    const blockReasons = await checkQueueEligibility(enrollment);
    if (blockReasons.length) {
      const joined = blockReasons.join(" ");
      const action = joined.includes("Suppression") ? "Email blocked by suppression" : joined.includes("verification") ? "Email blocked by verification" : "Email blocked by compliance";
      await blockQueue(joined, action, undefined, { leadId: enrollment.leadId, campaignId: enrollment.campaignId });
      continue;
    }

    for (const [index, step] of enrollment.campaign.steps.entries()) {
      const template = enrollment.campaign.templates.find((item) => item.stepNumber === step.stepNumber);
      const subject = renderTemplate(template?.subject ?? step.subject, enrollment.lead);
      const body = renderTemplate(template?.body ?? step.body, enrollment.lead);
      const identity = hasRequiredIdentity(body);
      const identityWarnings = [
        !identity.hasUnsubscribe && "Unsubscribe link is missing.",
        !identity.hasSender && "Sender identity is missing.",
        !identity.hasAgency && "Agency name is missing.",
        !identity.hasWebsite && "Website URL is missing.",
        enrollment.lead.country === "United States" && !identity.hasBusinessAddress && "Business address is missing for US outreach."
      ].filter(Boolean);

      if (identityWarnings.length) {
        await blockQueue(identityWarnings.join(" "), "Email blocked by compliance", undefined, {
          leadId: enrollment.leadId,
          campaignId: enrollment.campaignId,
          stepNumber: step.stepNumber
        });
        continue;
      }

      const scheduledBase = addBusinessDays(new Date(), step.delayDays);
      const scheduledFor = randomScheduledTime(scheduledBase, index);
      await prisma.sendingQueueItem.upsert({
        where: {
          leadId_campaignId_stepNumber: {
            leadId: enrollment.leadId,
            campaignId: enrollment.campaignId,
            stepNumber: step.stepNumber
          }
        },
        update: {},
        create: {
          leadId: enrollment.leadId,
          campaignId: enrollment.campaignId,
          campaignStepId: step.id,
          emailTemplateId: template?.id,
          inboxId: inbox?.id,
          stepNumber: step.stepNumber,
          recipientEmail: enrollment.lead.email ?? "",
          subject,
          body,
          status: "Ready for Review",
          scheduledFor
        }
      });
      queued += 1;
      await writeAudit("Email queued", "SendingQueueItem", undefined, "Email added to queue for review", {
        leadId: enrollment.leadId,
        campaignId: enrollment.campaignId,
        stepNumber: step.stepNumber,
        simulated: true
      });
    }
  }

  revalidatePath("/sending-queue");
  void queued;
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
