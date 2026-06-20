import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { writeAudit } from "@/lib/audit";
import { ReplyStatus } from "./replyClassificationService";
import { maybeAutoSyncLeadToGhl } from "@/lib/ghl/ghlService";

export const replyInclude = Prisma.validator<Prisma.ReplyInclude>()({
  lead: true,
  campaign: true,
  sendingQueueItem: true,
  emailSendLog: true
});

export type ReplyWithInclude = Prisma.ReplyGetPayload<{ include: typeof replyInclude }>;

function shouldStopFollowUps(status: ReplyStatus) {
  return ["Positive", "Booked", "Not Interested", "Unsubscribe Request", "Angry"].includes(status);
}

async function stopFutureFollowUps(leadId: string, campaignId: string | null | undefined, reason: string) {
  await prisma.sendingQueueItem.updateMany({
    where: {
      leadId,
      ...(campaignId ? { campaignId } : {}),
      status: { in: ["Queued", "Ready for Review", "Approved", "Scheduled"] }
    },
    data: { status: "Stopped", skippedReason: reason, skipReason: reason }
  });

  await prisma.campaignEnrollment.updateMany({
    where: { leadId, ...(campaignId ? { campaignId } : {}) },
    data: { status: "Completed", stoppedAt: new Date(), stopReason: reason }
  });

  await writeAudit("Follow-ups stopped due to reply", "Lead", leadId, reason, { campaignId });
}

async function suppressLead(leadId: string, reason: string, source = "Reply") {
  const lead = await prisma.lead.findUnique({ where: { id: leadId } });
  if (!lead?.email) return;

  await prisma.suppressionListEntry.upsert({
    where: { email: lead.email },
    update: { reason, source, notes: reason },
    create: { email: lead.email, reason, source, notes: reason }
  });
  await writeAudit("Lead suppressed from reply", "Lead", leadId, reason, { email: lead.email });
}

export async function applyReplyHandlingRules(replyId: string, options?: { referralAction?: "Stop" | "Pause"; outOfOfficeFollowUpAt?: Date }) {
  const reply = await prisma.reply.findUnique({ where: { id: replyId }, include: { lead: true } });
  if (!reply) return;

  const status = reply.replyStatus as ReplyStatus;
  const stopReason = `Reply status: ${status}`;

  if (shouldStopFollowUps(status)) {
    await stopFutureFollowUps(reply.leadId, reply.campaignId, stopReason);
  }

  if (status === "Positive") {
    await prisma.lead.update({ where: { id: reply.leadId }, data: { status: "Interested", ghlSyncStatus: "Ready for GHL" } });
    await writeAudit("Lead marked interested from reply", "Lead", reply.leadId, "Positive reply received", { replyId });
    await writeAudit("Lead marked Ready for GHL from reply", "Lead", reply.leadId, "Positive reply made lead Ready for GHL.", { replyId, trigger: "Interested" });
    await maybeAutoSyncLeadToGhl(reply.leadId, "Interested");
    return;
  }

  if (status === "Booked") {
    await prisma.lead.update({ where: { id: reply.leadId }, data: { status: "Booked Appointment", ghlSyncStatus: "Ready for GHL" } });
    const existing = await prisma.booking.findFirst({ where: { leadId: reply.leadId, status: "Booked" } });
    if (!existing) {
      await prisma.booking.create({
        data: {
          leadId: reply.leadId,
          bookedAt: reply.repliedAt,
          status: "Booked",
          notes: reply.replySummary ?? "Booking created from reply."
        }
      });
    }
    await writeAudit("Lead marked booked from reply", "Lead", reply.leadId, "Booked reply received", { replyId });
    await writeAudit("Lead marked Ready for GHL from reply", "Lead", reply.leadId, "Booked reply made lead Ready for GHL.", { replyId, trigger: "Booked Appointment" });
    await maybeAutoSyncLeadToGhl(reply.leadId, "Booked Appointment");
    return;
  }

  if (status === "Not Interested") {
    await prisma.lead.update({ where: { id: reply.leadId }, data: { status: "Not Interested", doNotContact: true } });
    await suppressLead(reply.leadId, "Not Interested");
    return;
  }

  if (status === "Unsubscribe Request") {
    await prisma.lead.update({ where: { id: reply.leadId }, data: { status: "Unsubscribed", unsubscribed: true, doNotContact: true } });
    await suppressLead(reply.leadId, "Unsubscribe Request");
    await writeAudit("Lead unsubscribed from reply", "Lead", reply.leadId, "Unsubscribe request received", { replyId });
    return;
  }

  if (status === "Angry") {
    await prisma.lead.update({ where: { id: reply.leadId }, data: { status: "Do Not Contact", doNotContact: true } });
    await suppressLead(reply.leadId, "Angry reply");
    return;
  }

  if (status === "Out of Office") {
    await prisma.campaignEnrollment.updateMany({
      where: { leadId: reply.leadId, ...(reply.campaignId ? { campaignId: reply.campaignId } : {}) },
      data: { status: "Paused", stopReason: "Out of office reply" }
    });
    if (options?.outOfOfficeFollowUpAt) {
      await prisma.lead.update({ where: { id: reply.leadId }, data: { nextFollowUpAt: options.outOfOfficeFollowUpAt } });
      await writeAudit("Out of office follow-up rescheduled", "Lead", reply.leadId, "Follow-up rescheduled after out-of-office reply", {
        replyId,
        nextFollowUpAt: options.outOfOfficeFollowUpAt
      });
    }
    await writeAudit("Reply status changed", "Reply", reply.id, "Out of office reply paused follow-up", { leadId: reply.leadId });
    return;
  }

  if (status === "Referral") {
    if (options?.referralAction === "Stop") {
      await stopFutureFollowUps(reply.leadId, reply.campaignId, "Referral reply stopped sequence");
    } else {
      await prisma.campaignEnrollment.updateMany({
        where: { leadId: reply.leadId, ...(reply.campaignId ? { campaignId: reply.campaignId } : {}) },
        data: { status: "Paused", stopReason: "Referral reply" }
      });
    }
    await writeAudit("Reply status changed", "Reply", reply.id, "Referral reply handled", { referralAction: options?.referralAction ?? "Pause" });
  }
}

export async function changeReplyStatus(replyId: string, status: ReplyStatus) {
  const reply = await prisma.reply.update({
    where: { id: replyId },
    data: { replyStatus: status },
    include: replyInclude
  });
  await writeAudit("Reply status changed", "Reply", reply.id, `Reply status changed to ${status}`, { leadId: reply.leadId });
  await applyReplyHandlingRules(reply.id);
  return reply;
}
