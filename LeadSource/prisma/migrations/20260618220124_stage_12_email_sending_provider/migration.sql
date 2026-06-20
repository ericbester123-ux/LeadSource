-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_EmailSendLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "leadId" TEXT NOT NULL,
    "campaignId" TEXT,
    "campaignStepId" TEXT,
    "sendingQueueItemId" TEXT,
    "inboxId" TEXT,
    "provider" TEXT NOT NULL DEFAULT 'simulation',
    "providerMessageId" TEXT,
    "recipientEmail" TEXT NOT NULL DEFAULT '',
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "simulated" BOOLEAN NOT NULL DEFAULT true,
    "failureReason" TEXT,
    "errorMessage" TEXT,
    "metadata" TEXT,
    "sentAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "EmailSendLog_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "EmailSendLog_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "EmailSendLog_campaignStepId_fkey" FOREIGN KEY ("campaignStepId") REFERENCES "CampaignStep" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "EmailSendLog_sendingQueueItemId_fkey" FOREIGN KEY ("sendingQueueItemId") REFERENCES "SendingQueueItem" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "EmailSendLog_inboxId_fkey" FOREIGN KEY ("inboxId") REFERENCES "SendingInbox" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_EmailSendLog" ("body", "createdAt", "failureReason", "id", "inboxId", "leadId", "provider", "sentAt", "simulated", "status", "subject") SELECT "body", "createdAt", "failureReason", "id", "inboxId", "leadId", "provider", "sentAt", "simulated", "status", "subject" FROM "EmailSendLog";
DROP TABLE "EmailSendLog";
ALTER TABLE "new_EmailSendLog" RENAME TO "EmailSendLog";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
