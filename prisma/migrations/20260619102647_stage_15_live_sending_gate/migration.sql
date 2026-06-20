-- AlterTable
ALTER TABLE "DomainReputationCheck" ADD COLUMN "lastGateBlockReason" TEXT;
ALTER TABLE "DomainReputationCheck" ADD COLUMN "lastGateCheckAt" DATETIME;
ALTER TABLE "DomainReputationCheck" ADD COLUMN "liveSendingEnabledAt" DATETIME;
ALTER TABLE "DomainReputationCheck" ADD COLUMN "liveSendingEnabledBy" TEXT;
