"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { writeAudit } from "@/lib/audit";

function value(formData: FormData, key: string) {
  const raw = formData.get(key);
  return typeof raw === "string" && raw.trim() ? raw.trim() : undefined;
}

export async function saveEmailTemplateAction(formData: FormData) {
  const name = value(formData, "name");
  const subject = value(formData, "subject");
  const body = value(formData, "body");
  if (!name || !subject || !body) return;
  const template = await prisma.emailTemplate.create({
    data: {
      name,
      subject,
      body,
      campaignId: value(formData, "campaignId"),
      stepNumber: Number.parseInt(value(formData, "stepNumber") ?? "", 10) || undefined,
      mergeTags: "{{firstName}}, {{companyName}}, {{calendarLink}}, {{unsubscribeLink}}, {{businessAddress}}"
    }
  });
  await writeAudit("Email template saved", "EmailTemplate", template.id, "Email Builder created a template", { name });
  revalidatePath("/email-builder");
}

export async function deleteEmailTemplateAction(formData: FormData) {
  const id = value(formData, "id");
  if (!id) return;
  await prisma.emailTemplate.delete({ where: { id } });
  await writeAudit("Email template deleted", "EmailTemplate", id, "Template removed from Email Builder");
  revalidatePath("/email-builder");
}
