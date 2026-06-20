"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { writeAudit } from "@/lib/audit";
import { verifyLeadEmailWithProvider } from "@/lib/email-verification/emailVerificationService";

function ids(formData: FormData) {
  return formData.getAll("leadIds").filter((id): id is string => typeof id === "string" && Boolean(id));
}

async function verifyLead(leadId: string) {
  await verifyLeadEmailWithProvider(leadId);
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
      reason,
      metadata: JSON.stringify({ manualOverride: true, reason }),
      manuallyApproved: status !== "Invalid",
      verifiedAt: new Date(),
      provider: "manual"
    },
    create: {
      leadId,
      status,
      resultDetails: reason,
      reason,
      metadata: JSON.stringify({ manualOverride: true, reason }),
      manuallyApproved: status !== "Invalid",
      verifiedAt: new Date(),
      provider: "manual"
    }
  });
  await writeAudit("Email verification manual override", "EmailVerification", leadId, "Manual email verification override", { status, reason });
  revalidatePath("/email-verification");
  revalidatePath("/leads");
}
