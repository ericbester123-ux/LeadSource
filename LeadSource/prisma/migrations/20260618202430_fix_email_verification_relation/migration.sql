-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'Admin',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Lead" (
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
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "LeadSource" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT,
    "description" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "LeadDiscoveryRun" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "query" TEXT NOT NULL,
    "country" TEXT,
    "city" TEXT,
    "region" TEXT,
    "state" TEXT,
    "industry" TEXT,
    "niche" TEXT,
    "keywords" TEXT,
    "companyType" TEXT,
    "minLeadScore" INTEGER,
    "maxLeadsPerDay" INTEGER NOT NULL DEFAULT 50,
    "provider" TEXT NOT NULL DEFAULT 'mock',
    "status" TEXT NOT NULL DEFAULT 'Completed',
    "leadsFound" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "LeadScore" (
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
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "EmailVerification" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "leadId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'Not Checked',
    "provider" TEXT NOT NULL DEFAULT 'local',
    "resultDetails" TEXT,
    "manuallyApproved" BOOLEAN NOT NULL DEFAULT false,
    "verifiedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "ComplianceCheck" (
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
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Campaign" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "mode" TEXT NOT NULL DEFAULT 'Review Required',
    "targetCountry" TEXT,
    "targetLocations" TEXT,
    "targetIndustry" TEXT,
    "targetNiche" TEXT,
    "offer" TEXT,
    "minimumLeadScore" INTEGER NOT NULL DEFAULT 75,
    "maxLeadsDiscoveredPerDay" INTEGER NOT NULL DEFAULT 50,
    "maxEmailsSentPerDay" INTEGER NOT NULL DEFAULT 20,
    "sendingWindowStart" TEXT NOT NULL DEFAULT '09:00',
    "sendingWindowEnd" TEXT NOT NULL DEFAULT '15:30',
    "sendingDays" TEXT NOT NULL DEFAULT 'Monday-Friday',
    "requireManualApprovalBeforeSend" BOOLEAN NOT NULL DEFAULT true,
    "autoEnrollLeads" BOOLEAN NOT NULL DEFAULT false,
    "stopOnReply" BOOLEAN NOT NULL DEFAULT true,
    "stopOnBooking" BOOLEAN NOT NULL DEFAULT true,
    "stopOnUnsubscribe" BOOLEAN NOT NULL DEFAULT true,
    "stopOnBounce" BOOLEAN NOT NULL DEFAULT true,
    "syncInterestedLeadsToGhl" BOOLEAN NOT NULL DEFAULT true,
    "syncBookedLeadsToGhl" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "CampaignStep" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "campaignId" TEXT NOT NULL,
    "stepNumber" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "delayDays" INTEGER NOT NULL,
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "CampaignEnrollment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "campaignId" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'Ready for Review',
    "currentStep" INTEGER NOT NULL DEFAULT 1,
    "approvedAt" DATETIME,
    "stoppedAt" DATETIME,
    "stopReason" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "EmailTemplate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "campaignId" TEXT,
    "name" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "stepNumber" INTEGER,
    "mergeTags" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "SendingInbox" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'SMTP',
    "fromName" TEXT,
    "dailyLimit" INTEGER NOT NULL DEFAULT 20,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "warmupMode" BOOLEAN NOT NULL DEFAULT true,
    "sendingDomain" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "SendingQueueItem" (
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
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "EmailSendLog" (
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
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "OutreachActivity" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "leadId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "metadata" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Reply" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "leadId" TEXT NOT NULL,
    "repliedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "replyStatus" TEXT NOT NULL DEFAULT 'No Reply',
    "replySentiment" TEXT,
    "replySummary" TEXT,
    "rawReplyBody" TEXT,
    "manualNotes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Booking" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "leadId" TEXT NOT NULL,
    "bookedAt" DATETIME NOT NULL,
    "calendarLink" TEXT,
    "status" TEXT NOT NULL DEFAULT 'Booked',
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "SuppressionListEntry" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "notes" TEXT,
    "source" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Settings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "description" TEXT,
    "simulateEmailSending" BOOLEAN NOT NULL DEFAULT true,
    "reviewRequired" BOOLEAN NOT NULL DEFAULT true,
    "dailyLimitPerInbox" INTEGER NOT NULL DEFAULT 20,
    "emailVerificationRequired" BOOLEAN NOT NULL DEFAULT true,
    "complianceCheckRequired" BOOLEAN NOT NULL DEFAULT true,
    "unsubscribeLinkRequired" BOOLEAN NOT NULL DEFAULT true,
    "suppressionListActive" BOOLEAN NOT NULL DEFAULT true,
    "doNotContactLogicActive" BOOLEAN NOT NULL DEFAULT true,
    "auditLogsEnabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "IntegrationConfig" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "provider" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT false,
    "config" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "DomainReputationCheck" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sendingDomain" TEXT NOT NULL,
    "spfConfigured" BOOLEAN NOT NULL DEFAULT false,
    "dkimConfigured" BOOLEAN NOT NULL DEFAULT false,
    "dmarcConfigured" BOOLEAN NOT NULL DEFAULT false,
    "customTrackingDomainConfigured" BOOLEAN NOT NULL DEFAULT false,
    "dedicatedSendingDomain" BOOLEAN NOT NULL DEFAULT false,
    "businessAddressAdded" BOOLEAN NOT NULL DEFAULT false,
    "unsubscribeLinkEnabled" BOOLEAN NOT NULL DEFAULT true,
    "emailVerificationEnabled" BOOLEAN NOT NULL DEFAULT true,
    "sendingLimitsConfigured" BOOLEAN NOT NULL DEFAULT true,
    "suppressionListActive" BOOLEAN NOT NULL DEFAULT true,
    "dailyLimitPerInbox" INTEGER NOT NULL DEFAULT 20,
    "warmupMode" BOOLEAN NOT NULL DEFAULT true,
    "bounceThreshold" REAL NOT NULL DEFAULT 0.03,
    "complaintThreshold" REAL NOT NULL DEFAULT 0.001,
    "unsubscribeThreshold" REAL NOT NULL DEFAULT 0.02,
    "status" TEXT NOT NULL DEFAULT 'Needs Review',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "GHLSyncLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "leadId" TEXT,
    "syncType" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "ghlContactId" TEXT,
    "ghlOpportunityId" TEXT,
    "payload" TEXT,
    "error" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "reason" TEXT,
    "metadata" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Lead_email_key" ON "Lead"("email");

-- CreateIndex
CREATE UNIQUE INDEX "LeadScore_leadId_key" ON "LeadScore"("leadId");

-- CreateIndex
CREATE UNIQUE INDEX "EmailVerification_leadId_key" ON "EmailVerification"("leadId");

-- CreateIndex
CREATE UNIQUE INDEX "ComplianceCheck_leadId_key" ON "ComplianceCheck"("leadId");

-- CreateIndex
CREATE UNIQUE INDEX "CampaignEnrollment_campaignId_leadId_key" ON "CampaignEnrollment"("campaignId", "leadId");

-- CreateIndex
CREATE UNIQUE INDEX "SendingInbox_email_key" ON "SendingInbox"("email");

-- CreateIndex
CREATE UNIQUE INDEX "SuppressionListEntry_email_key" ON "SuppressionListEntry"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Settings_key_key" ON "Settings"("key");
