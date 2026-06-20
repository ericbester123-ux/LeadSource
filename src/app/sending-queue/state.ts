export type QueueBlockCategory =
  | "alreadyQueuedSkipped"
  | "missingEmail"
  | "invalidEmail"
  | "verificationStatus"
  | "complianceStatus"
  | "suppression"
  | "doNotContact"
  | "unsubscribed"
  | "bounced"
  | "lowScore"
  | "missingTemplate"
  | "stopRule"
  | "otherErrors";

export type QueueGenerationBlockedLead = {
  leadId: string;
  leadName: string;
  email: string;
  campaignName: string;
  stepNumber?: number;
  category: QueueBlockCategory;
  reason: string;
};

export type QueueGenerationState = {
  ran: boolean;
  enrollmentsChecked: number;
  created: number;
  skipped: number;
  alreadyQueuedSkipped: number;
  missingEmail: number;
  invalidEmail: number;
  verificationStatus: number;
  complianceStatus: number;
  suppression: number;
  doNotContact: number;
  unsubscribed: number;
  bounced: number;
  lowScore: number;
  missingTemplate: number;
  stopRule: number;
  otherErrors: number;
  blockedLeads: QueueGenerationBlockedLead[];
  message?: string;
};

export const emptyQueueGenerationState: QueueGenerationState = {
  ran: false,
  enrollmentsChecked: 0,
  created: 0,
  skipped: 0,
  alreadyQueuedSkipped: 0,
  missingEmail: 0,
  invalidEmail: 0,
  verificationStatus: 0,
  complianceStatus: 0,
  suppression: 0,
  doNotContact: 0,
  unsubscribed: 0,
  bounced: 0,
  lowScore: 0,
  missingTemplate: 0,
  stopRule: 0,
  otherErrors: 0,
  blockedLeads: []
};
