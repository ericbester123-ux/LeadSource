import { prisma } from "@/lib/prisma";
import { writeAudit } from "@/lib/audit";

const GHL_AUTO_SYNC_SETTINGS_KEY = "ghl_auto_sync_settings";

export type GhlAutoSyncSettings = {
  autoSyncInterestedLeadsToGhl: boolean;
  autoSyncBookedLeadsToGhl: boolean;
};

function settingsValue(settings: GhlAutoSyncSettings) {
  return JSON.stringify(settings);
}

export async function getGhlAutoSyncSettings(): Promise<GhlAutoSyncSettings> {
  const settings = await prisma.settings.upsert({
    where: { key: GHL_AUTO_SYNC_SETTINGS_KEY },
    update: {},
    create: {
      key: GHL_AUTO_SYNC_SETTINGS_KEY,
      value: settingsValue({
        autoSyncInterestedLeadsToGhl: false,
        autoSyncBookedLeadsToGhl: false
      }),
      description: "Global GoHighLevel auto-sync controls. Defaults are off.",
      autoSyncInterestedToGhl: false,
      autoSyncBookedToGhl: false
    }
  });

  return {
    autoSyncInterestedLeadsToGhl: settings.autoSyncInterestedToGhl,
    autoSyncBookedLeadsToGhl: settings.autoSyncBookedToGhl
  };
}

export async function updateGhlAutoSyncSettings(next: GhlAutoSyncSettings) {
  const current = await getGhlAutoSyncSettings();
  const updated = await prisma.settings.upsert({
    where: { key: GHL_AUTO_SYNC_SETTINGS_KEY },
    update: {
      value: settingsValue(next),
      autoSyncInterestedToGhl: next.autoSyncInterestedLeadsToGhl,
      autoSyncBookedToGhl: next.autoSyncBookedLeadsToGhl
    },
    create: {
      key: GHL_AUTO_SYNC_SETTINGS_KEY,
      value: settingsValue(next),
      description: "Global GoHighLevel auto-sync controls. Defaults are off.",
      autoSyncInterestedToGhl: next.autoSyncInterestedLeadsToGhl,
      autoSyncBookedToGhl: next.autoSyncBookedLeadsToGhl
    }
  });

  if (current.autoSyncInterestedLeadsToGhl !== next.autoSyncInterestedLeadsToGhl) {
    await writeAudit(
      next.autoSyncInterestedLeadsToGhl ? "Auto-sync interested enabled" : "Auto-sync interested disabled",
      "Settings",
      updated.id,
      `GHL auto-sync for Interested leads ${next.autoSyncInterestedLeadsToGhl ? "enabled" : "disabled"}.`,
      { value: next.autoSyncInterestedLeadsToGhl }
    );
  }

  if (current.autoSyncBookedLeadsToGhl !== next.autoSyncBookedLeadsToGhl) {
    await writeAudit(
      next.autoSyncBookedLeadsToGhl ? "Auto-sync booked enabled" : "Auto-sync booked disabled",
      "Settings",
      updated.id,
      `GHL auto-sync for Booked leads ${next.autoSyncBookedLeadsToGhl ? "enabled" : "disabled"}.`,
      { value: next.autoSyncBookedLeadsToGhl }
    );
  }

  return {
    autoSyncInterestedLeadsToGhl: updated.autoSyncInterestedToGhl,
    autoSyncBookedLeadsToGhl: updated.autoSyncBookedToGhl
  };
}
