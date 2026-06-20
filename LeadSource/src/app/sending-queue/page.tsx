import { prisma } from "@/lib/prisma";
import { sendingQueueInclude } from "@/lib/sending-queue";
import { getDomainRiskSummary, getOrCreateDomainGuard } from "@/lib/domain-guard/domainReputationGuard";
import { evaluateLiveSendingGate } from "@/lib/domain-guard/liveSendingGate";
import { SendingQueueClient } from "./sending-queue-client";

export const dynamic = "force-dynamic";

export default async function SendingQueuePage() {
  const simulate = process.env.SIMULATE_EMAIL_SENDING !== "false";
  const provider = process.env.EMAIL_PROVIDER ?? "smtp";
  const [queueItems, campaigns, inboxes, guard, risk] = await Promise.all([
    prisma.sendingQueueItem.findMany({
      include: sendingQueueInclude,
      orderBy: [{ scheduledFor: "asc" }, { createdAt: "desc" }]
    }),
    prisma.campaign.findMany({ orderBy: { name: "asc" } }),
    prisma.sendingInbox.findMany({ orderBy: { email: "asc" } }),
    getOrCreateDomainGuard(),
    getDomainRiskSummary()
  ]);
  const gate = evaluateLiveSendingGate(guard);

  return <SendingQueueClient queueItems={queueItems} campaigns={campaigns} inboxes={inboxes} simulate={simulate} provider={provider} liveGateBlocked={!gate.allowed} liveGateReasons={gate.reasons} domainRiskWarnings={risk.warnings} />;
}
