import { prisma } from "@/lib/prisma";
import { scoringLeadInclude } from "@/lib/lead-include";
import { AiLeadScoringClient } from "./ai-lead-scoring-client";

export const dynamic = "force-dynamic";

export default async function AiLeadScoringPage() {
  const leads = await prisma.lead.findMany({
    include: scoringLeadInclude,
    orderBy: { updatedAt: "desc" }
  });
  return <AiLeadScoringClient leads={leads} />;
}
