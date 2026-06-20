"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { writeAudit } from "@/lib/audit";
import { verifyEmailAddress } from "@/lib/email-verification/emailVerificationProvider";

const localVerificationRequiredMessage = "Local syntax check passed. Real provider verification required.";

function ids(formData: FormData) {
  return formData.getAll("leadIds").filter((id): id is string => typeof id === "string" && Boolean(id));
}

async function verifyLead(leadId: string) {
  const lead = await prisma.lead.findUnique({ where: { id: leadId } });
  if (!lead) return;
  const result = await verifyEmailAddress(lead.email, lead.bounced);
  await prisma.emailVerification.upsert({
    where: { leadId },
    update: {
      status: result.status,
      provider: result.provider,
      resultDetails: result.details,
      verifiedAt: new Date(),
      manuallyApproved: false
    },
    create: {
      leadId,
      status: result.status,
      provider: result.provider,
      resultDetails: result.details,
      verifiedAt: new Date()
    }
  });
  if (result.status === "Valid" && ["zerobounce", "neverbounce"].includes(result.provider)) {
    await prisma.lead.update({ where: { id: leadId }, data: { status: "Verified" } });
  }
  await writeAudit("Email verified", "EmailVerification", leadId, `Email verification completed with ${result.provider}`, {
    status: result.status,
    provider: result.provider,
    details: result.details,
    warning: result.warning
  });
}

export async function verifySelectedLeads(formData: FormData) {
  for (const id of ids(formData)) {
    await verifyLead(id);
  }
  revalidatePath("/email-verification");
  revalidatePath("/leads");
}

export async function verifyAllUnverifiedLeads() {
  const leads = await prisma.lead.findMany({
    where: {
      OR: [
        { emailVerification: null },
        { emailVerification: { status: "Not Checked" } }
      ]
    },
    select: { id: true }
  });
  for (const lead of leads) {
    await verifyLead(lead.id);
  }
  revalidatePath("/email-verification");
  revalidatePath("/leads");
}

export async function repairLocalValidVerifications() {
  const records = await prisma.emailVerification.findMany({
    where: { provider: "local", status: "Valid" },
    select: { id: true, leadId: true }
  });

  await prisma.emailVerification.updateMany({
    where: { provider: "local", status: "Valid" },
    data: {
      status: "Unknown",
      resultDetails: localVerificationRequiredMessage,
      manuallyApproved: false
    }
  });

  await writeAudit("Email verification local-valid repaired", "EmailVerification", undefined, "Local Valid records changed to Unknown", {
    count: records.length,
    leadIds: records.map((record) => record.leadId)
  });
  revalidatePath("/email-verification");
  revalidatePath("/leads");
  revalidatePath("/sending-queue");
}

export async function overrideVerification(formData: FormData) {
  const leadId = formData.get("leadId");
  const status = String(formData.get("status") ?? "Unknown");
  const reason = String(formData.get("reason") ?? "Manual verification override");
  if (typeof leadId !== "string") return;

  await prisma.emailVerification.upsert({
    where: { leadId },
    update: {
      status,
      resultDetails: reason,
      manuallyApproved: status !== "Invalid",
      verifiedAt: new Date(),
      provider: "manual"
    },
    create: {
      leadId,
      status,
      resultDetails: reason,
      manuallyApproved: status !== "Invalid",
      verifiedAt: new Date(),
      provider: "manual"
    }
  });
  await writeAudit("Email verification override applied", "EmailVerification", leadId, "Manual email verification override", { status, reason });
  revalidatePath("/email-verification");
  revalidatePath("/leads");
}
