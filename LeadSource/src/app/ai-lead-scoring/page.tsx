import { prisma } from "@/lib/prisma";
import { scoringLeadInclude } from "@/lib/lead-include";
import { getAiProviderStatus } from "@/lib/ai/aiProviderFactory";
import { AiLeadScoringClient } from "./ai-lead-scoring-client";

export const dynamic = "force-dynamic";

export default async function AiLeadScoringPage() {
  const [leads, aiProviderStatus] = await Promise.all([
    prisma.lead.findMany({
      include: scoringLeadInclude,
      orderBy: { updatedAt: "desc" }
    }),
    getAiProviderStatus()
  ]);
  return <AiLeadScoringClient leads={leads} aiProviderStatus={aiProviderStatus} />;
}
