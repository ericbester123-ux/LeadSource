import { prisma } from "@/lib/prisma";
import { writeAudit } from "@/lib/audit";
import { getEmailVerificationProvider } from "./emailVerificationProviderFactory";

export async function verifyLeadEmailWithProvider(leadId: string) {
  const lead = await prisma.lead.findUnique({ where: { id: leadId } });
  if (!lead) return null;
  if (!lead.email) {
    const verification = await prisma.emailVerification.upsert({
      where: { leadId },
      update: {
        status: "Not Checked",
        provider: "local",
        resultDetails: "Email is missing. Add an email before verification.",
        reason: "missing_email",
        confidence: 0,
        metadata: JSON.stringify({ missingEmail: true }),
        verifiedAt: null,
        manuallyApproved: false
      },
      create: {
        leadId,
        status: "Not Checked",
        provider: "local",
        resultDetails: "Email is missing. Add an email before verification.",
        reason: "missing_email",
        confidence: 0,
        metadata: JSON.stringify({ missingEmail: true })
      }
    });
    await writeAudit("Missing email discovered", "EmailVerification", verification.id, "Lead has no email to verify", { leadId });
    return verification;
  }

  const provider = getEmailVerificationProvider();
  const config = await prisma.integrationConfig.findUnique({ where: { id: "email-verification-provider" } });
  if (config?.config !== provider.name) {
    await writeAudit("Email verification provider changed", "IntegrationConfig", "email-verification-provider", "Email verification provider selection changed", {
      from: config?.config ?? "unset",
      to: provider.name
    });
  }
  await prisma.integrationConfig.upsert({
    where: { id: "email-verification-provider" },
    update: {
      provider: "EmailVerification",
      name: provider.label,
      isEnabled: provider.name !== "local" && provider.hasApiKey,
      config: provider.name
    },
    create: {
      id: "email-verification-provider",
      provider: "EmailVerification",
      name: provider.label,
      isEnabled: provider.name !== "local" && provider.hasApiKey,
      config: provider.name
    }
  });
  await writeAudit("Email verification started", "EmailVerification", leadId, `Email verification started with ${provider.label}`, { provider: provider.name });

  try {
    const result = await provider.verify(lead.email, lead.bounced);
    const providerUsed = result.provider ?? provider.name;
    const metadata = {
      providerRequested: provider.name,
      providerUsed,
      fallbackUsed: Boolean(result.fallbackUsed),
      raw: result.metadata ?? null
    };
    const verification = await prisma.emailVerification.upsert({
      where: { leadId },
      update: {
        status: result.status,
        provider: providerUsed,
        resultDetails: result.details,
        reason: result.reason,
        confidence: result.confidence,
        metadata: JSON.stringify(metadata),
        verifiedAt: new Date(),
        manuallyApproved: false
      },
      create: {
        leadId,
        status: result.status,
        provider: providerUsed,
        resultDetails: result.details,
        reason: result.reason,
        confidence: result.confidence,
        metadata: JSON.stringify(metadata),
        verifiedAt: new Date()
      }
    });

    if (result.status === "Valid") {
      await prisma.lead.update({ where: { id: leadId }, data: { status: "Verified" } });
    }

    if (result.fallbackUsed) {
      await writeAudit("Email verification fallback used", "EmailVerification", verification.id, `${provider.label} unavailable; local syntax fallback used`, metadata);
    }
    await writeAudit("Email verification completed", "EmailVerification", verification.id, `Email verification completed with ${providerUsed}`, {
      status: result.status,
      reason: result.reason,
      confidence: result.confidence
    });
    return verification;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Email verification failed.";
    await writeAudit("Email verification failed", "EmailVerification", leadId, message, { provider: provider.name });
    throw error;
  }
}
