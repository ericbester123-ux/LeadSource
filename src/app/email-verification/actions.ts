"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { writeAudit } from "@/lib/audit";
import { localEmailSyntaxCheck } from "@/lib/email-verification/localEmailSyntaxCheck";

function ids(formData: FormData) {
  return formData.getAll("leadIds").filter((id): id is string => typeof id === "string" && Boolean(id));
}

async function verifyLead(leadId: string) {
  const lead = await prisma.lead.findUnique({ where: { id: leadId } });
  if (!lead) return;
  const result = localEmailSyntaxCheck(lead.email, lead.bounced);
  await prisma.emailVerification.upsert({
    where: { leadId },
    update: {
      status: result.status,
      provider: "local",
      resultDetails: result.details,
      verifiedAt: new Date(),
      manuallyApproved: false
    },
    create: {
      leadId,
      status: result.status,
      provider: "local",
      resultDetails: result.details,
      verifiedAt: new Date()
    }
  });
  if (result.status === "Valid") {
    await prisma.lead.update({ where: { id: leadId }, data: { status: "Verified" } });
  }
  await writeAudit("Email verified", "EmailVerification", leadId, "Local syntax verification completed", result);
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
