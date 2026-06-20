-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Reply" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "leadId" TEXT NOT NULL,
    "campaignId" TEXT,
    "sendingQueueItemId" TEXT,
    "emailSendLogId" TEXT,
    "repliedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "replyStatus" TEXT NOT NULL DEFAULT 'No Reply',
    "replySentiment" TEXT,
    "replySummary" TEXT,
    "rawReplyBody" TEXT,
    "manualNotes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Reply_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Reply_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Reply_sendingQueueItemId_fkey" FOREIGN KEY ("sendingQueueItemId") REFERENCES "SendingQueueItem" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Reply_emailSendLogId_fkey" FOREIGN KEY ("emailSendLogId") REFERENCES "EmailSendLog" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Reply" ("createdAt", "id", "leadId", "manualNotes", "rawReplyBody", "repliedAt", "replySentiment", "replyStatus", "replySummary", "updatedAt") SELECT "createdAt", "id", "leadId", "manualNotes", "rawReplyBody", "repliedAt", "replySentiment", "replyStatus", "replySummary", "updatedAt" FROM "Reply";
DROP TABLE "Reply";
ALTER TABLE "new_Reply" RENAME TO "Reply";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
