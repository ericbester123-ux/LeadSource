import { prisma } from "@/lib/prisma";
import { writeAudit } from "@/lib/audit";
import { classifyReply, ReplyStatus } from "./replyClassificationService";
import { applyReplyHandlingRules, replyInclude } from "./replyService";

export type ManualReplyInput = {
  leadId: string;
  campaignId?: string;
  sendingQueueItemId?: string;
  emailSendLogId?: string;
  replyStatus?: ReplyStatus;
  rawReplyBody?: string;
  replySummary?: string;
  manualNotes?: string;
  repliedAt?: Date;
  outOfOfficeFollowUpAt?: Date;
  referralAction?: "Stop" | "Pause";
};

export async function addManualReply(input: ManualReplyInput) {
  const classification = classifyReply(input.rawReplyBody ?? "");
  const status = input.replyStatus && input.replyStatus !== "No Reply" ? input.replyStatus : classification.status;

  const reply = await prisma.reply.create({
    data: {
      leadId: input.leadId,
      campaignId: input.campaignId || undefined,
      sendingQueueItemId: input.sendingQueueItemId || undefined,
      emailSendLogId: input.emailSendLogId || undefined,
      replyStatus: status,
      replySentiment: classification.sentiment,
      replySummary: input.replySummary || classification.summary,
      rawReplyBody: input.rawReplyBody,
      manualNotes: input.manualNotes,
      repliedAt: input.repliedAt ?? new Date()
    },
    include: replyInclude
  });

  await writeAudit("Reply added manually", "Reply", reply.id, "Manual reply recorded", { leadId: input.leadId, campaignId: input.campaignId });
  await writeAudit("Reply classified", "Reply", reply.id, `Reply classified as ${status}`, { keywordClassification: classification });
  await applyReplyHandlingRules(reply.id, {
    outOfOfficeFollowUpAt: input.outOfOfficeFollowUpAt,
    referralAction: input.referralAction
  });

  return reply;
}
