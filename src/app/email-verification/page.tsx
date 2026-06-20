import { prisma } from "@/lib/prisma";
import { verificationLeadInclude } from "@/lib/lead-include";
import { EmailVerificationClient } from "./email-verification-client";

export const dynamic = "force-dynamic";

export default async function EmailVerificationPage() {
  const leads = await prisma.lead.findMany({
    include: verificationLeadInclude,
    orderBy: { updatedAt: "desc" }
  });
  return <EmailVerificationClient leads={leads} />;
}
