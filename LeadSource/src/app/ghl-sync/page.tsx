import { prisma } from "@/lib/prisma";
import { ghlLeadInclude } from "@/lib/ghl/ghlContactMapper";
import { validateGhlConfig } from "@/lib/ghl/ghlConfigValidator";
import { getGhlAutoSyncSettings } from "@/lib/ghl/ghlAutoSyncSettings";
import { GhlSyncClient } from "./ghl-sync-client";

export const dynamic = "force-dynamic";

export default async function GhlSyncPage() {
  const config = validateGhlConfig();
  const [readyLeads, syncedLeads, failedLogs, previewLogs, campaigns, autoSyncSettings, autoSyncAuditLogs] = await Promise.all([
    prisma.lead.findMany({
      where: {
        OR: [
          { ghlSyncStatus: { in: ["Ready for GHL", "Failed"] } },
          { status: { in: ["Interested", "Booked Appointment"] }, ghlSyncStatus: "Not Ready" }
        ]
      },
      include: ghlLeadInclude,
      orderBy: [{ ghlSyncStatus: "asc" }, { updatedAt: "desc" }]
    }),
    prisma.lead.findMany({
      where: { ghlSyncStatus: "Synced" },
      include: ghlLeadInclude,
      orderBy: { ghlLastSyncedAt: "desc" }
    }),
    prisma.gHLSyncLog.findMany({
      where: { syncStatus: "Failed" },
      include: { lead: true },
      orderBy: { createdAt: "desc" },
      take: 50
    }),
    prisma.gHLSyncLog.findMany({
      include: { lead: true },
      orderBy: { createdAt: "desc" },
      take: 50
    }),
    prisma.campaign.findMany({ orderBy: { name: "asc" } }),
    getGhlAutoSyncSettings(),
    prisma.auditLog.findMany({
      where: { action: { in: ["Auto-sync skipped", "Auto-sync triggered", "Auto-sync completed", "Auto-sync failed"] } },
      orderBy: { createdAt: "desc" },
      take: 8
    })
  ]);

  return (
    <GhlSyncClient
      config={config}
      readyLeads={readyLeads}
      syncedLeads={syncedLeads}
      failedLogs={failedLogs}
      previewLogs={previewLogs}
      campaigns={campaigns}
      autoSyncSettings={autoSyncSettings}
      autoSyncAuditLogs={autoSyncAuditLogs}
    />
  );
}
