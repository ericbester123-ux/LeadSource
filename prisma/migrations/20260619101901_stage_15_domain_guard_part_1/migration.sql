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
    "bounceThreshold" REAL NOT NULL DEFAULT 0.03,
    "complaintThreshold" REAL NOT NULL DEFAULT 0.001,
    "unsubscribeThreshold" REAL NOT NULL DEFAULT 0.02,
    "status" TEXT NOT NULL DEFAULT 'Needs Review',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_DomainReputationCheck" ("bounceThreshold", "businessAddressAdded", "complaintThreshold", "createdAt", "customTrackingDomainConfigured", "dailyLimitPerInbox", "dedicatedSendingDomain", "dkimConfigured", "dmarcConfigured", "emailVerificationEnabled", "id", "sendingDomain", "sendingLimitsConfigured", "spfConfigured", "status", "suppressionListActive", "unsubscribeLinkEnabled", "unsubscribeThreshold", "updatedAt", "warmupMode") SELECT "bounceThreshold", "businessAddressAdded", "complaintThreshold", "createdAt", "customTrackingDomainConfigured", "dailyLimitPerInbox", "dedicatedSendingDomain", "dkimConfigured", "dmarcConfigured", "emailVerificationEnabled", "id", "sendingDomain", "sendingLimitsConfigured", "spfConfigured", "status", "suppressionListActive", "unsubscribeLinkEnabled", "unsubscribeThreshold", "updatedAt", "warmupMode" FROM "DomainReputationCheck";
DROP TABLE "DomainReputationCheck";
ALTER TABLE "new_DomainReputationCheck" RENAME TO "DomainReputationCheck";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
