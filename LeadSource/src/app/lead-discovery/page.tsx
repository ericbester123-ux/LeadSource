import { prisma } from "@/lib/prisma";
import { getLeadDiscoveryProviderStatus } from "@/lib/lead-discovery/leadDiscoveryProviderFactory";
import { LeadDiscoveryClient } from "./lead-discovery-client";

export const dynamic = "force-dynamic";

export default async function LeadDiscoveryPage() {
  const providerStatus = getLeadDiscoveryProviderStatus();
  const runs = await prisma.leadDiscoveryRun.findMany({
    orderBy: { createdAt: "desc" },
    take: 12
  });

  return <LeadDiscoveryClient runs={runs} providerStatus={providerStatus} />;
}
