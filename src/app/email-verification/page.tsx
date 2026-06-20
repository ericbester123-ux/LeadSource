import { prisma } from "@/lib/prisma";
import { verificationLeadInclude } from "@/lib/lead-include";
import { getEmailVerificationProviderStatus } from "@/lib/email-verification/emailVerificationProvider";
import { EmailVerificationClient } from "./email-verification-client";

export const dynamic = "force-dynamic";

export default async function EmailVerificationPage() {
  const providerStatus = getEmailVerificationProviderStatus();
  const leads = await prisma.lead.findMany({
    include: verificationLeadInclude,
    orderBy: { updatedAt: "desc" }
  });
  return <EmailVerificationClient leads={leads} providerStatus={providerStatus} />;
}
