"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { writeAudit } from "@/lib/audit";

function value(formData: FormData, key: string) {
  const raw = formData.get(key);
  return typeof raw === "string" && raw.trim() ? raw.trim() : undefined;
}

export async function addSuppressionEntry(formData: FormData) {
  const email = value(formData, "email")?.toLowerCase();
  const reason = value(formData, "reason") ?? "Manual Suppression";
  const notes = value(formData, "notes");
  if (!email) return;

  await prisma.suppressionListEntry.upsert({
    where: { email },
    update: { reason, notes, source: "Suppression List" },
    create: { email, reason, notes, source: "Suppression List" }
  });
  await prisma.lead.updateMany({ where: { email }, data: { doNotContact: true, status: "Do Not Contact" } });
  await prisma.complianceCheck.updateMany({ where: { lead: { email } }, data: { status: "Suppressed", riskLevel: "Blocked", notes: reason, checkedAt: new Date() } });
  await writeAudit("Suppression entry added", "SuppressionListEntry", email, reason, { notes });
  revalidatePath("/suppression-list");
  revalidatePath("/compliance");
}

export async function removeSuppressionEntry(formData: FormData) {
  const id = value(formData, "id");
  if (!id) return;
  const entry = await prisma.suppressionListEntry.findUnique({ where: { id } });
  if (!entry) return;
  await prisma.suppressionListEntry.delete({ where: { id } });
  await writeAudit("Suppression entry removed", "SuppressionListEntry", id, "Manual suppression removal", { email: entry.email });
  revalidatePath("/suppression-list");
  revalidatePath("/compliance");
}
