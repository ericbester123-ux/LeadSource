import { prisma } from "@/lib/prisma";
import { replyInclude } from "@/lib/replies/replyService";
import { RepliesClient } from "./replies-client";

export const dynamic = "force-dynamic";

export default async function RepliesPage() {
  const [replies, leads, campaigns, queueItems, sendLogs] = await Promise.all([
    prisma.reply.findMany({ include: replyInclude, orderBy: { repliedAt: "desc" } }),
    prisma.lead.findMany({
      include: { campaignEnrollments: { include: { campaign: true } } },
      orderBy: [{ companyName: "asc" }, { email: "asc" }]
    }),
    prisma.campaign.findMany({ orderBy: { name: "asc" } }),
    prisma.sendingQueueItem.findMany({
      include: { lead: true, campaign: true },
      orderBy: { createdAt: "desc" },
      take: 200
    }),
    prisma.emailSendLog.findMany({
      include: { lead: true, campaign: true },
      orderBy: { createdAt: "desc" },
      take: 200
    })
  ]);

  return <RepliesClient replies={replies} leads={leads} campaigns={campaigns} queueItems={queueItems} sendLogs={sendLogs} />;
}
