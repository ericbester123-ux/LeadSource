import { prisma } from "@/lib/prisma";
import { leadInclude } from "@/lib/lead-include";
import { LeadsClient } from "./leads-client";

export const dynamic = "force-dynamic";

export default async function LeadsPage() {
  const [leads, campaigns] = await Promise.all([
    prisma.lead.findMany({
      include: leadInclude,
      orderBy: { updatedAt: "desc" }
    }),
    prisma.campaign.findMany({ orderBy: { name: "asc" } })
  ]);

  return <LeadsClient leads={leads} campaigns={campaigns} />;
}
