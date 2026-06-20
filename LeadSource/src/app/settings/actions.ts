"use server";

import { revalidatePath } from "next/cache";
import { updateGhlAutoSyncSettings } from "@/lib/ghl/ghlAutoSyncSettings";
import { sendSmtpTestEmail } from "@/lib/email-sending/emailProviderFactory";
import type { SmtpTestEmailState } from "./state";

export async function updateGhlAutoSyncSettingsAction(formData: FormData) {
  await updateGhlAutoSyncSettings({
    autoSyncInterestedLeadsToGhl: formData.get("autoSyncInterestedLeadsToGhl") === "on",
    autoSyncBookedLeadsToGhl: formData.get("autoSyncBookedLeadsToGhl") === "on"
  });
  revalidatePath("/settings");
  revalidatePath("/ghl-sync");
  revalidatePath("/audit-logs");
}

export async function sendSmtpTestEmailAction(_previousState: SmtpTestEmailState, formData: FormData): Promise<SmtpTestEmailState> {
  const to = String(formData.get("testEmailTo") ?? "").trim();
  const confirmation = String(formData.get("smtpTestConfirmation") ?? "").trim();
  const result = await sendSmtpTestEmail({
    to,
    confirmation,
    subject: "LeadSource SMTP test email",
    body: [
      "This is a LeadSource SMTP test email.",
      "",
      "Campaign live sending remains disabled.",
      "SIMULATE_EMAIL_SENDING controls whether this test is simulated or sent live."
    ].join("\n")
  });
  revalidatePath("/settings");
  revalidatePath("/domain-guard");
  revalidatePath("/audit-logs");

  return {
    ok: result.ok,
    message: result.ok
      ? result.provider === "simulation"
        ? "SMTP test was simulated. No real email was sent."
        : "SMTP test email sent."
      : result.errorMessage ?? "SMTP test email failed.",
    provider: result.provider,
    providerMessageId: result.providerMessageId
  };
}
