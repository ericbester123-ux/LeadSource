/*
  Warnings:

  - Added the required column `body` to the `SendingQueueItem` table without a default value. This is not possible if the table is not empty.
  - Added the required column `recipientEmail` to the `SendingQueueItem` table without a default value. This is not possible if the table is not empty.
  - Added the required column `subject` to the `SendingQueueItem` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_SendingQueueItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "leadId" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "campaignStepId" TEXT,
    "emailTemplateId" TEXT,
    "inboxId" TEXT,
    "stepNumber" INTEGER NOT NULL,
    "recipientEmail" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'Ready for Review',
    "scheduledFor" DATETIME,
    "approvedAt" DATETIME,
    "sentAt" DATETIME,
    "failureReason" TEXT,
    "skippedReason" TEXT,
    "skipReason" TEXT,
    "providerMessageId" TEXT,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "SendingQueueItem_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "SendingQueueItem_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "SendingQueueItem_campaignStepId_fkey" FOREIGN KEY ("campaignStepId") REFERENCES "CampaignStep" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "SendingQueueItem_emailTemplateId_fkey" FOREIGN KEY ("emailTemplateId") REFERENCES "EmailTemplate" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "SendingQueueItem_inboxId_fkey" FOREIGN KEY ("inboxId") REFERENCES "SendingInbox" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_SendingQueueItem" ("approvedAt", "campaignId", "createdAt", "id", "inboxId", "leadId", "scheduledFor", "sentAt", "skippedReason", "status", "stepNumber", "updatedAt") SELECT "approvedAt", "campaignId", "createdAt", "id", "inboxId", "leadId", "scheduledFor", "sentAt", "skippedReason", "status", "stepNumber", "updatedAt" FROM "SendingQueueItem";
DROP TABLE "SendingQueueItem";
ALTER TABLE "new_SendingQueueItem" RENAME TO "SendingQueueItem";
CREATE UNIQUE INDEX "SendingQueueItem_leadId_campaignId_stepNumber_key" ON "SendingQueueItem"("leadId", "campaignId", "stepNumber");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
