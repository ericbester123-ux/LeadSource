-- The Lead <-> EmailVerification relation is represented by EmailVerification.leadId.
-- This migration is intentionally non-destructive and preserves existing seed/core data.
-- SQLite tables generated from the current schema include:
--   "EmailVerification"."leadId" TEXT NOT NULL UNIQUE
--   FOREIGN KEY ("leadId") REFERENCES "Lead" ("id") ON DELETE CASCADE ON UPDATE CASCADE

