import { prisma } from "@/lib/prisma";
import { LeadDiscoveryClient } from "./lead-discovery-client";

export const dynamic = "force-dynamic";

export default async function LeadDiscoveryPage() {
  const runs = await prisma.leadDiscoveryRun.findMany({
    orderBy: { createdAt: "desc" },
    take: 12
  });

  return <LeadDiscoveryClient runs={runs} />;
}
