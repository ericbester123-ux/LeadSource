-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Lead" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "firstName" TEXT,
    "lastName" TEXT,
    "fullName" TEXT,
    "email" TEXT,
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
    "googlePlaceId" TEXT,
    "googleRating" REAL,
    "googleReviewsCount" INTEGER,
    "personalisationNote" TEXT,
    "contactType" TEXT NOT NULL DEFAULT 'Unknown',
    "status" TEXT NOT NULL DEFAULT 'Discovered',
    "tags" TEXT,
    "notes" TEXT,
    "doNotContact" BOOLEAN NOT NULL DEFAULT false,
    "unsubscribed" BOOLEAN NOT NULL DEFAULT false,
    "bounced" BOOLEAN NOT NULL DEFAULT false,
    "ghlSyncStatus" TEXT NOT NULL DEFAULT 'Not Ready',
    "ghlContactId" TEXT,
    "ghlOpportunityId" TEXT,
    "ghlLastSyncedAt" DATETIME,
    "ghlSyncError" TEXT,
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
INSERT INTO "new_Lead" ("bounced", "city", "companyName", "confidenceScore", "contactPageUrl", "contactType", "country", "createdAt", "dateDiscovered", "discoveryQuery", "discoveryRunId", "doNotContact", "email", "firstName", "fullName", "ghlContactId", "ghlLastSyncedAt", "ghlOpportunityId", "ghlSyncError", "ghlSyncStatus", "googlePlaceId", "googleRating", "googleReviewsCount", "id", "industry", "lastContactedAt", "lastName", "lawfulBasisNotes", "leadSourceId", "legitimateInterestNotes", "location", "manuallyApproved", "nextFollowUpAt", "niche", "notes", "personalisationNote", "phone", "publicProfileUrl", "socialLinks", "sourcePlatform", "sourceUrl", "stateRegion", "status", "tags", "unsubscribed", "updatedAt", "website") SELECT "bounced", "city", "companyName", "confidenceScore", "contactPageUrl", "contactType", "country", "createdAt", "dateDiscovered", "discoveryQuery", "discoveryRunId", "doNotContact", "email", "firstName", "fullName", "ghlContactId", "ghlLastSyncedAt", "ghlOpportunityId", "ghlSyncError", "ghlSyncStatus", "googlePlaceId", "googleRating", "googleReviewsCount", "id", "industry", "lastContactedAt", "lastName", "lawfulBasisNotes", "leadSourceId", "legitimateInterestNotes", "location", "manuallyApproved", "nextFollowUpAt", "niche", "notes", "personalisationNote", "phone", "publicProfileUrl", "socialLinks", "sourcePlatform", "sourceUrl", "stateRegion", "status", "tags", "unsubscribed", "updatedAt", "website" FROM "Lead";
DROP TABLE "Lead";
ALTER TABLE "new_Lead" RENAME TO "Lead";
CREATE UNIQUE INDEX "Lead_email_key" ON "Lead"("email");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
