import { prisma } from "@/lib/prisma";
import { DiscoveredLead } from "./types";

export type DiscoverySuppressionResult = {
  suppressed: boolean;
  suppressionReason?: string;
};

export async function checkDiscoverySuppression(lead: DiscoveredLead): Promise<DiscoverySuppressionResult> {
  if (!lead.email) return { suppressed: false };
  const email = lead.email.toLowerCase();
  const [suppressed, existingLead] = await Promise.all([
    prisma.suppressionListEntry.findUnique({ where: { email } }),
    prisma.lead.findUnique({ where: { email }, include: { complianceCheck: true } })
  ]);

  if (suppressed) return { suppressed: true, suppressionReason: `Suppression list: ${suppressed.reason}` };
  if (existingLead?.doNotContact) return { suppressed: true, suppressionReason: "Existing lead is do-not-contact." };
  if (existingLead?.unsubscribed) return { suppressed: true, suppressionReason: "Existing lead is unsubscribed." };
  if (existingLead?.bounced) return { suppressed: true, suppressionReason: "Existing lead has bounced." };
  if (["Failed", "Suppressed", "Unsubscribed", "Do Not Contact"].includes(existingLead?.complianceCheck?.status ?? "")) {
    return { suppressed: true, suppressionReason: `Existing compliance blocked: ${existingLead?.complianceCheck?.status}.` };
  }

  return { suppressed: false };
}
