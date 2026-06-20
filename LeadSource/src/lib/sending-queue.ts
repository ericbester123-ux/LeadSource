import { Prisma } from "@prisma/client";

export const sendingQueueInclude = Prisma.validator<Prisma.SendingQueueItemInclude>()({
  lead: {
    include: {
      emailVerification: true,
      leadScore: true,
      complianceCheck: true,
      replies: true,
      bookings: true
    }
  },
  campaign: true,
  campaignStep: true,
  emailTemplate: true,
  inbox: true
});

export type SendingQueueItemWithInclude = Prisma.SendingQueueItemGetPayload<{
  include: typeof sendingQueueInclude;
}>;

export const queueStatuses = [
  "Queued",
  "Ready for Review",
  "Approved",
  "Scheduled",
  "Sent",
  "Failed",
  "Blocked",
  "Skipped",
  "Stopped",
  "Suppressed"
];

export const defaultSendingWindow = {
  start: "09:00",
  end: "15:30",
  weekdaysOnly: true,
  dailyLimit: 20
};
