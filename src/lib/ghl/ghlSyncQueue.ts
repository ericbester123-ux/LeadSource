import { bulkSyncLeadsToGhl, syncLeadToGhl } from "./ghlService";

export async function queueGhlSyncPlaceholder(leadIds: string[]) {
  return {
    queued: leadIds.length,
    leadIds,
    message: "GHL sync queue architecture is ready. Stage 14 Part 3 processes requested leads synchronously and safely."
  };
}

export async function processGhlSyncQueue(leadIds: string[]) {
  return bulkSyncLeadsToGhl(leadIds);
}

export async function processSingleGhlSync(leadId: string) {
  return syncLeadToGhl(leadId);
}
