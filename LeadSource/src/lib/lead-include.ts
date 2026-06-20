import { Prisma } from "@prisma/client";

export const leadInclude = Prisma.validator<Prisma.LeadInclude>()({
  emailVerification: true,
  leadScore: true,
  complianceCheck: true,
  campaignEnrollments: {
    include: {
      campaign: true
    }
  },
  sendingQueueItems: true,
  emailSendLogs: true,
  outreachActivities: true,
  replies: true,
  bookings: true,
  ghlSyncLogs: true,
  leadSource: true
});

export type LeadWithInclude = Prisma.LeadGetPayload<{
  include: typeof leadInclude;
}>;

export const scoringLeadInclude = Prisma.validator<Prisma.LeadInclude>()({
  leadScore: true,
  complianceCheck: true
});

export type ScoringLeadWithInclude = Prisma.LeadGetPayload<{
  include: typeof scoringLeadInclude;
}>;

export const verificationLeadInclude = Prisma.validator<Prisma.LeadInclude>()({
  emailVerification: true
});

export type VerificationLeadWithInclude = Prisma.LeadGetPayload<{
  include: typeof verificationLeadInclude;
}>;
