-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_AuditLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "reason" TEXT,
    "metadata" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_AuditLog" ("action", "createdAt", "entityId", "entityType", "id", "metadata", "reason", "userId") SELECT "action", "createdAt", "entityId", "entityType", "id", "metadata", "reason", "userId" FROM "AuditLog";
DROP TABLE "AuditLog";
ALTER TABLE "new_AuditLog" RENAME TO "AuditLog";
CREATE TABLE "new_Booking" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "leadId" TEXT NOT NULL,
    "bookedAt" DATETIME NOT NULL,
    "calendarLink" TEXT,
    "status" TEXT NOT NULL DEFAULT 'Booked',
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Booking_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Booking" ("bookedAt", "calendarLink", "createdAt", "id", "leadId", "notes", "status", "updatedAt") SELECT "bookedAt", "calendarLink", "createdAt", "id", "leadId", "notes", "status", "updatedAt" FROM "Booking";
DROP TABLE "Booking";
ALTER TABLE "new_Booking" RENAME TO "Booking";
CREATE TABLE "new_CampaignEnrollment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "campaignId" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'Ready for Review',
    "currentStep" INTEGER NOT NULL DEFAULT 1,
    "approvedAt" DATETIME,
    "stoppedAt" DATETIME,
    "stopReason" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CampaignEnrollment_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CampaignEnrollment_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_CampaignEnrollment" ("approvedAt", "campaignId", "createdAt", "currentStep", "id", "leadId", "status", "stopReason", "stoppedAt", "updatedAt") SELECT "approvedAt", "campaignId", "createdAt", "currentStep", "id", "leadId", "status", "stopReason", "stoppedAt", "updatedAt" FROM "CampaignEnrollment";
DROP TABLE "CampaignEnrollment";
ALTER TABLE "new_CampaignEnrollment" RENAME TO "CampaignEnrollment";
CREATE UNIQUE INDEX "CampaignEnrollment_campaignId_leadId_key" ON "CampaignEnrollment"("campaignId", "leadId");
CREATE TABLE "new_CampaignStep" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "campaignId" TEXT NOT NULL,
    "stepNumber" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "delayDays" INTEGER NOT NULL,
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CampaignStep_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_CampaignStep" ("body", "campaignId", "createdAt", "delayDays", "id", "name", "stepNumber", "subject", "updatedAt") SELECT "body", "campaignId", "createdAt", "delayDays", "id", "name", "stepNumber", "subject", "updatedAt" FROM "CampaignStep";
DROP TABLE "CampaignStep";
ALTER TABLE "new_CampaignStep" RENAME TO "CampaignStep";
CREATE TABLE "new_ComplianceCheck" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "leadId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'Pending Review',
    "countryProfile" TEXT,
    "riskLevel" TEXT,
    "sourceUrlPresent" BOOLEAN NOT NULL DEFAULT false,
    "lawfulBasisPresent" BOOLEAN NOT NULL DEFAULT false,
    "unsubscribeRequired" BOOLEAN NOT NULL DEFAULT true,
    "manualApprovalRequired" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "checkedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ComplianceCheck_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_ComplianceCheck" ("checkedAt", "countryProfile", "createdAt", "id", "lawfulBasisPresent", "leadId", "manualApprovalRequired", "notes", "riskLevel", "sourceUrlPresent", "status", "unsubscribeRequired", "updatedAt") SELECT "checkedAt", "countryProfile", "createdAt", "id", "lawfulBasisPresent", "leadId", "manualApprovalRequired", "notes", "riskLevel", "sourceUrlPresent", "status", "unsubscribeRequired", "updatedAt" FROM "ComplianceCheck";
DROP TABLE "ComplianceCheck";
ALTER TABLE "new_ComplianceCheck" RENAME TO "ComplianceCheck";
CREATE UNIQUE INDEX "ComplianceCheck_leadId_key" ON "ComplianceCheck"("leadId");
CREATE TABLE "new_EmailSendLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "leadId" TEXT NOT NULL,
    "inboxId" TEXT,
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'simulation',
    "status" TEXT NOT NULL,
    "simulated" BOOLEAN NOT NULL DEFAULT true,
    "failureReason" TEXT,
    "sentAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "EmailSendLog_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "EmailSendLog_inboxId_fkey" FOREIGN KEY ("inboxId") REFERENCES "SendingInbox" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_EmailSendLog" ("body", "createdAt", "failureReason", "id", "inboxId", "leadId", "provider", "sentAt", "simulated", "status", "subject") SELECT "body", "createdAt", "failureReason", "id", "inboxId", "leadId", "provider", "sentAt", "simulated", "status", "subject" FROM "EmailSendLog";
DROP TABLE "EmailSendLog";
ALTER TABLE "new_EmailSendLog" RENAME TO "EmailSendLog";
CREATE TABLE "new_EmailTemplate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "campaignId" TEXT,
    "name" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "stepNumber" INTEGER,
    "mergeTags" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "EmailTemplate_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_EmailTemplate" ("body", "campaignId", "createdAt", "id", "mergeTags", "name", "stepNumber", "subject", "updatedAt") SELECT "body", "campaignId", "createdAt", "id", "mergeTags", "name", "stepNumber", "subject", "updatedAt" FROM "EmailTemplate";
DROP TABLE "EmailTemplate";
ALTER TABLE "new_EmailTemplate" RENAME TO "EmailTemplate";
CREATE TABLE "new_EmailVerification" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "leadId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'Not Checked',
    "provider" TEXT NOT NULL DEFAULT 'local',
    "resultDetails" TEXT,
    "manuallyApproved" BOOLEAN NOT NULL DEFAULT false,
    "verifiedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "EmailVerification_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_EmailVerification" ("createdAt", "id", "leadId", "manuallyApproved", "provider", "resultDetails", "status", "updatedAt", "verifiedAt") SELECT "createdAt", "id", "leadId", "manuallyApproved", "provider", "resultDetails", "status", "updatedAt", "verifiedAt" FROM "EmailVerification";
DROP TABLE "EmailVerification";
ALTER TABLE "new_EmailVerification" RENAME TO "EmailVerification";
CREATE UNIQUE INDEX "EmailVerification_leadId_key" ON "EmailVerification"("leadId");
CREATE TABLE "new_GHLSyncLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "leadId" TEXT,
    "syncType" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "ghlContactId" TEXT,
    "ghlOpportunityId" TEXT,
    "payload" TEXT,
    "error" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "GHLSyncLog_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_GHLSyncLog" ("createdAt", "error", "ghlContactId", "ghlOpportunityId", "id", "leadId", "payload", "status", "syncType") SELECT "createdAt", "error", "ghlContactId", "ghlOpportunityId", "id", "leadId", "payload", "status", "syncType" FROM "GHLSyncLog";
DROP TABLE "GHLSyncLog";
ALTER TABLE "new_GHLSyncLog" RENAME TO "GHLSyncLog";
CREATE TABLE "new_Lead" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "firstName" TEXT,
    "lastName" TEXT,
    "fullName" TEXT,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "companyName" TEXT NOT NULL,
    "website" TEXT,
    "location" TEXT,
    "city" TEXT,
    "stateRegion" TEXT,
    "country" TEXT NOT NULL,
    "industry" TEXT,
    "niche" TEXT,
    "sourceUrl" TEXT,
    "sourcePlatform" TEXT,
    "publicProfileUrl" TEXT,
    "contactPageUrl" TEXT,
    "socialLinks" TEXT,
    "dateDiscovered" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "discoveryQuery" TEXT,
    "confidenceScore" INTEGER,
    "personalisationNote" TEXT,
    "contactType" TEXT NOT NULL DEFAULT 'Unknown',
    "status" TEXT NOT NULL DEFAULT 'Discovered',
    "tags" TEXT,
    "notes" TEXT,
    "doNotContact" BOOLEAN NOT NULL DEFAULT false,
    "unsubscribed" BOOLEAN NOT NULL DEFAULT false,
    "bounced" BOOLEAN NOT NULL DEFAULT false,
    "ghlSyncStatus" TEXT NOT NULL DEFAULT 'Not Ready',
    "lastContactedAt" DATETIME,
    "nextFollowUpAt" DATETIME,
    "manuallyApproved" BOOLEAN NOT NULL DEFAULT false,
    "lawfulBasisNotes" TEXT,
    "legitimateInterestNotes" TEXT,
    "leadSourceId" TEXT,
    "discoveryRunId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Lead_leadSourceId_fkey" FOREIGN KEY ("leadSourceId") REFERENCES "LeadSource" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Lead_discoveryRunId_fkey" FOREIGN KEY ("discoveryRunId") REFERENCES "LeadDiscoveryRun" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Lead" ("bounced", "city", "companyName", "confidenceScore", "contactPageUrl", "contactType", "country", "createdAt", "dateDiscovered", "discoveryQuery", "discoveryRunId", "doNotContact", "email", "firstName", "fullName", "ghlSyncStatus", "id", "industry", "lastContactedAt", "lastName", "lawfulBasisNotes", "leadSourceId", "legitimateInterestNotes", "location", "manuallyApproved", "nextFollowUpAt", "niche", "notes", "personalisationNote", "phone", "publicProfileUrl", "socialLinks", "sourcePlatform", "sourceUrl", "stateRegion", "status", "tags", "unsubscribed", "updatedAt", "website") SELECT "bounced", "city", "companyName", "confidenceScore", "contactPageUrl", "contactType", "country", "createdAt", "dateDiscovered", "discoveryQuery", "discoveryRunId", "doNotContact", "email", "firstName", "fullName", "ghlSyncStatus", "id", "industry", "lastContactedAt", "lastName", "lawfulBasisNotes", "leadSourceId", "legitimateInterestNotes", "location", "manuallyApproved", "nextFollowUpAt", "niche", "notes", "personalisationNote", "phone", "publicProfileUrl", "socialLinks", "sourcePlatform", "sourceUrl", "stateRegion", "status", "tags", "unsubscribed", "updatedAt", "website" FROM "Lead";
DROP TABLE "Lead";
ALTER TABLE "new_Lead" RENAME TO "Lead";
CREATE UNIQUE INDEX "Lead_email_key" ON "Lead"("email");
CREATE TABLE "new_LeadScore" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "leadId" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "qualityLabel" TEXT NOT NULL,
    "reasonForScore" TEXT,
    "suggestedPainPoint" TEXT,
    "suggestedOfferAngle" TEXT,
    "suggestedSubjectLine" TEXT,
    "suggestedFirstEmail" TEXT,
    "recommendedCampaign" TEXT,
    "complianceRiskNotes" TEXT,
    "personalisationFirstLine" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "LeadScore_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_LeadScore" ("complianceRiskNotes", "createdAt", "id", "leadId", "personalisationFirstLine", "qualityLabel", "reasonForScore", "recommendedCampaign", "score", "suggestedFirstEmail", "suggestedOfferAngle", "suggestedPainPoint", "suggestedSubjectLine", "updatedAt") SELECT "complianceRiskNotes", "createdAt", "id", "leadId", "personalisationFirstLine", "qualityLabel", "reasonForScore", "recommendedCampaign", "score", "suggestedFirstEmail", "suggestedOfferAngle", "suggestedPainPoint", "suggestedSubjectLine", "updatedAt" FROM "LeadScore";
DROP TABLE "LeadScore";
ALTER TABLE "new_LeadScore" RENAME TO "LeadScore";
CREATE UNIQUE INDEX "LeadScore_leadId_key" ON "LeadScore"("leadId");
CREATE TABLE "new_OutreachActivity" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "leadId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "metadata" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "OutreachActivity_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_OutreachActivity" ("createdAt", "id", "leadId", "metadata", "summary", "type") SELECT "createdAt", "id", "leadId", "metadata", "summary", "type" FROM "OutreachActivity";
DROP TABLE "OutreachActivity";
ALTER TABLE "new_OutreachActivity" RENAME TO "OutreachActivity";
CREATE TABLE "new_Reply" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "leadId" TEXT NOT NULL,
    "repliedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "replyStatus" TEXT NOT NULL DEFAULT 'No Reply',
    "replySentiment" TEXT,
    "replySummary" TEXT,
    "rawReplyBody" TEXT,
    "manualNotes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Reply_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Reply" ("createdAt", "id", "leadId", "manualNotes", "rawReplyBody", "repliedAt", "replySentiment", "replyStatus", "replySummary", "updatedAt") SELECT "createdAt", "id", "leadId", "manualNotes", "rawReplyBody", "repliedAt", "replySentiment", "replyStatus", "replySummary", "updatedAt" FROM "Reply";
DROP TABLE "Reply";
ALTER TABLE "new_Reply" RENAME TO "Reply";
CREATE TABLE "new_SendingQueueItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "leadId" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "inboxId" TEXT,
    "stepNumber" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'Ready for Review',
    "scheduledFor" DATETIME,
    "approvedAt" DATETIME,
    "sentAt" DATETIME,
    "skippedReason" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "SendingQueueItem_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "SendingQueueItem_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "SendingQueueItem_inboxId_fkey" FOREIGN KEY ("inboxId") REFERENCES "SendingInbox" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_SendingQueueItem" ("approvedAt", "campaignId", "createdAt", "id", "inboxId", "leadId", "scheduledFor", "sentAt", "skippedReason", "status", "stepNumber", "updatedAt") SELECT "approvedAt", "campaignId", "createdAt", "id", "inboxId", "leadId", "scheduledFor", "sentAt", "skippedReason", "status", "stepNumber", "updatedAt" FROM "SendingQueueItem";
DROP TABLE "SendingQueueItem";
ALTER TABLE "new_SendingQueueItem" RENAME TO "SendingQueueItem";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
