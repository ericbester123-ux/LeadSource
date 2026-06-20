/*
  Warnings:

  - Made the column `leadId` on table `GHLSyncLog` required. This step will fail if there are existing NULL values in that column.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_GHLSyncLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "leadId" TEXT NOT NULL,
    "syncType" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "ghlContactId" TEXT,
    "ghlOpportunityId" TEXT,
    "payload" TEXT,
    "error" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "GHLSyncLog_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_GHLSyncLog" ("createdAt", "error", "ghlContactId", "ghlOpportunityId", "id", "leadId", "payload", "status", "syncType") SELECT "createdAt", "error", "ghlContactId", "ghlOpportunityId", "id", "leadId", "payload", "status", "syncType" FROM "GHLSyncLog";
DROP TABLE "GHLSyncLog";
ALTER TABLE "new_GHLSyncLog" RENAME TO "GHLSyncLog";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
