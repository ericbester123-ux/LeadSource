-- AlterTable
ALTER TABLE "EmailVerification" ADD COLUMN "confidence" REAL;
ALTER TABLE "EmailVerification" ADD COLUMN "metadata" TEXT;
ALTER TABLE "EmailVerification" ADD COLUMN "reason" TEXT;
