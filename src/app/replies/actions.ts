"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { addManualReply } from "@/lib/replies/manualReplyHandler";
import { changeReplyStatus } from "@/lib/replies/replyService";
import { replyStatuses, ReplyStatus } from "@/lib/replies/replyClassificationService";
import { writeAudit } from "@/lib/audit";

function value(formData: FormData, key: string) {
  const raw = formData.get(key);
  return typeof raw === "string" && raw.trim() ? raw.trim() : undefined;
}

function statusValue(input?: string): ReplyStatus | undefined {
  return input && replyStatuses.includes(input) ? input : undefined;
}

export async function addManualReplyAction(formData: FormData) {
  const leadId = value(formData, "leadId");
  if (!leadId) return;

  const outOfOfficeFollowUpAt = value(formData, "outOfOfficeFollowUpAt");
  await addManualReply({
    leadId,
    campaignId: value(formData, "campaignId"),
    sendingQueueItemId: value(formData, "sendingQueueItemId"),
    emailSendLogId: value(formData, "emailSendLogId"),
    replyStatus: statusValue(value(formData, "replyStatus")),
    rawReplyBody: value(formData, "rawReplyBody"),
    replySummary: value(formData, "replySummary"),
    manualNotes: value(formData, "manualNotes"),
    outOfOfficeFollowUpAt: outOfOfficeFollowUpAt ? new Date(outOfOfficeFollowUpAt) : undefined,
    referralAction: value(formData, "referralAction") === "Stop" ? "Stop" : "Pause"
  });

  revalidatePath("/replies");
  revalidatePath("/sending-queue");
}

export async function updateReplyAction(formData: FormData) {
  const id = value(formData, "replyId");
  if (!id) return;

  const status = statusValue(value(formData, "replyStatus"));
  const data = {
    ...(status ? { replyStatus: status } : {}),
    replySummary: value(formData, "replySummary"),
    rawReplyBody: value(formData, "rawReplyBody"),
    manualNotes: value(formData, "manualNotes")
  };

  await prisma.reply.update({ where: { id }, data });
  await writeAudit("Reply status changed", "Reply", id, "Reply details updated manually", data);
  if (status) await changeReplyStatus(id, status);

  revalidatePath("/replies");
  revalidatePath("/sending-queue");
}

export async function markReplyStatusAction(formData: FormData) {
  const id = value(formData, "replyId");
  const status = statusValue(value(formData, "replyStatus"));
  if (!id || !status) return;

  await changeReplyStatus(id, status);
  revalidatePath("/replies");
  revalidatePath("/sending-queue");
}

export async function createReferralLeadAction(formData: FormData) {
  const sourceReplyId = value(formData, "replyId");
  const email = value(formData, "referralEmail");
  const companyName = value(formData, "referralCompanyName");
  const fullName = value(formData, "referralFullName");
  const country = value(formData, "referralCountry") ?? "Unknown";
  if (!sourceReplyId || !email || !companyName) return;

  const lead = await prisma.lead.upsert({
    where: { email },
    update: {
      fullName,
      companyName,
      country,
      status: "New",
      sourcePlatform: "Referral reply"
    },
    create: {
      email,
      fullName,
      companyName,
      country,
      status: "New",
      sourcePlatform: "Referral reply",
      contactType: "Referral",
      notes: `Created from reply ${sourceReplyId}`
    }
  });

  await writeAudit("Lead created from referral reply", "Lead", lead.id, "Referral lead created manually", { sourceReplyId });
  revalidatePath("/replies");
}
