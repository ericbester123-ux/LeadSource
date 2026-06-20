import { bulkSyncLeadsToGhl, syncLeadToGhl } from "./ghlService";

export async function queueGhlSyncPlaceholder(leadIds: string[]) {
  return {
    queued: leadIds.length,
    leadIds,
    message: "GHL sync queue architecture is ready. Preview mode remains active unless credentials are configured and a user-triggered sync runs."
  };
}

export async function processGhlSyncQueue(leadIds: string[]) {
  return bulkSyncLeadsToGhl(leadIds);
}

export async function processSingleGhlSync(leadId: string) {
  return syncLeadToGhl(leadId);
}
