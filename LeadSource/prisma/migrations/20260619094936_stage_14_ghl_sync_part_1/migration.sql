/*
  Warnings:

  - You are about to drop the column `status` on the `GHLSyncLog` table. All the data in the column will be lost.
  - You are about to drop the column `syncType` on the `GHLSyncLog` table. All the data in the column will be lost.
  - Added the required column `updatedAt` to the `GHLSyncLog` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Lead" ADD COLUMN "ghlContactId" TEXT;
ALTER TABLE "Lead" ADD COLUMN "ghlLastSyncedAt" DATETIME;
ALTER TABLE "Lead" ADD COLUMN "ghlOpportunityId" TEXT;
ALTER TABLE "Lead" ADD COLUMN "ghlSyncError" TEXT;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_GHLSyncLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "leadId" TEXT NOT NULL,
    "syncStatus" TEXT NOT NULL DEFAULT 'Not Ready',
    "ghlContactId" TEXT,
    "ghlOpportunityId" TEXT,
    "payload" TEXT,
    "response" TEXT,
    "error" TEXT,
    "syncedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "GHLSyncLog_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_GHLSyncLog" ("createdAt", "error", "ghlContactId", "ghlOpportunityId", "id", "leadId", "payload") SELECT "createdAt", "error", "ghlContactId", "ghlOpportunityId", "id", "leadId", "payload" FROM "GHLSyncLog";
DROP TABLE "GHLSyncLog";
ALTER TABLE "new_GHLSyncLog" RENAME TO "GHLSyncLog";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
