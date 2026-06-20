-- AlterTable
ALTER TABLE "Campaign" ADD COLUMN "pauseReason" TEXT;
ALTER TABLE "Campaign" ADD COLUMN "pausedAt" DATETIME;
ALTER TABLE "Campaign" ADD COLUMN "pausedBy" TEXT;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_DomainReputationCheck" (
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
    "complianceChecksActive" BOOLEAN NOT NULL DEFAULT true,
    "dailyLimitPerInbox" INTEGER NOT NULL DEFAULT 20,
    "sendingDays" TEXT NOT NULL DEFAULT 'Monday-Friday',
    "sendingWindowStart" TEXT NOT NULL DEFAULT '09:00',
    "sendingWindowEnd" TEXT NOT NULL DEFAULT '15:30',
    "warmupMode" BOOLEAN NOT NULL DEFAULT true,
    "simulationMode" BOOLEAN NOT NULL DEFAULT true,
    "liveSendingAllowed" BOOLEAN NOT NULL DEFAULT false,
    "liveSendingEnabledAt" DATETIME,
    "liveSendingEnabledBy" TEXT,
    "lastGateCheckAt" DATETIME,
    "lastGateBlockReason" TEXT,
    "bounceThreshold" REAL NOT NULL DEFAULT 0.03,
    "complaintThreshold" REAL NOT NULL DEFAULT 0.01,
    "unsubscribeThreshold" REAL NOT NULL DEFAULT 0.03,
    "status" TEXT NOT NULL DEFAULT 'Needs Review',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_DomainReputationCheck" ("bounceThreshold", "businessAddressAdded", "complaintThreshold", "complianceChecksActive", "createdAt", "customTrackingDomainConfigured", "dailyLimitPerInbox", "dedicatedSendingDomain", "dkimConfigured", "dmarcConfigured", "emailVerificationEnabled", "id", "lastGateBlockReason", "lastGateCheckAt", "liveSendingAllowed", "liveSendingEnabledAt", "liveSendingEnabledBy", "sendingDays", "sendingDomain", "sendingLimitsConfigured", "sendingWindowEnd", "sendingWindowStart", "simulationMode", "spfConfigured", "status", "suppressionListActive", "unsubscribeLinkEnabled", "unsubscribeThreshold", "updatedAt", "warmupMode") SELECT "bounceThreshold", "businessAddressAdded", "complaintThreshold", "complianceChecksActive", "createdAt", "customTrackingDomainConfigured", "dailyLimitPerInbox", "dedicatedSendingDomain", "dkimConfigured", "dmarcConfigured", "emailVerificationEnabled", "id", "lastGateBlockReason", "lastGateCheckAt", "liveSendingAllowed", "liveSendingEnabledAt", "liveSendingEnabledBy", "sendingDays", "sendingDomain", "sendingLimitsConfigured", "sendingWindowEnd", "sendingWindowStart", "simulationMode", "spfConfigured", "status", "suppressionListActive", "unsubscribeLinkEnabled", "unsubscribeThreshold", "updatedAt", "warmupMode" FROM "DomainReputationCheck";
DROP TABLE "DomainReputationCheck";
ALTER TABLE "new_DomainReputationCheck" RENAME TO "DomainReputationCheck";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
