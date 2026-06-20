-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Campaign" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "mode" TEXT NOT NULL DEFAULT 'Review Required',
    "pauseReason" TEXT,
    "pausedBy" TEXT,
    "pausedAt" DATETIME,
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
    "syncInterestedLeadsToGhl" BOOLEAN NOT NULL DEFAULT false,
    "syncBookedLeadsToGhl" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Campaign" ("autoEnrollLeads", "createdAt", "id", "maxEmailsSentPerDay", "maxLeadsDiscoveredPerDay", "minimumLeadScore", "mode", "name", "offer", "pauseReason", "pausedAt", "pausedBy", "requireManualApprovalBeforeSend", "sendingDays", "sendingWindowEnd", "sendingWindowStart", "stopOnBooking", "stopOnBounce", "stopOnReply", "stopOnUnsubscribe", "syncBookedLeadsToGhl", "syncInterestedLeadsToGhl", "targetCountry", "targetIndustry", "targetLocations", "targetNiche", "updatedAt") SELECT "autoEnrollLeads", "createdAt", "id", "maxEmailsSentPerDay", "maxLeadsDiscoveredPerDay", "minimumLeadScore", "mode", "name", "offer", "pauseReason", "pausedAt", "pausedBy", "requireManualApprovalBeforeSend", "sendingDays", "sendingWindowEnd", "sendingWindowStart", "stopOnBooking", "stopOnBounce", "stopOnReply", "stopOnUnsubscribe", "syncBookedLeadsToGhl", "syncInterestedLeadsToGhl", "targetCountry", "targetIndustry", "targetLocations", "targetNiche", "updatedAt" FROM "Campaign";
DROP TABLE "Campaign";
ALTER TABLE "new_Campaign" RENAME TO "Campaign";
CREATE TABLE "new_Settings" (
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
    "autoSyncInterestedToGhl" BOOLEAN NOT NULL DEFAULT false,
    "autoSyncBookedToGhl" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Settings" ("auditLogsEnabled", "complianceCheckRequired", "createdAt", "dailyLimitPerInbox", "description", "doNotContactLogicActive", "emailVerificationRequired", "id", "key", "reviewRequired", "simulateEmailSending", "suppressionListActive", "unsubscribeLinkRequired", "updatedAt", "value") SELECT "auditLogsEnabled", "complianceCheckRequired", "createdAt", "dailyLimitPerInbox", "description", "doNotContactLogicActive", "emailVerificationRequired", "id", "key", "reviewRequired", "simulateEmailSending", "suppressionListActive", "unsubscribeLinkRequired", "updatedAt", "value" FROM "Settings";
DROP TABLE "Settings";
ALTER TABLE "new_Settings" RENAME TO "Settings";
CREATE UNIQUE INDEX "Settings_key_key" ON "Settings"("key");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
