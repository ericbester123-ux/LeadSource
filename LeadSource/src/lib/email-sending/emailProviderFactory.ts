import { writeAudit } from "@/lib/audit";
import { checkLiveSendingSafety } from "./emailSafetyCheckService";
import { getConfiguredProviderName, isSimulationMode, SendEmailInput, SendEmailResult } from "./emailProvider";
import { simulatedEmailProvider } from "./simulatedEmailProvider";
import { getSmtpConfigStatus, smtpEmailProvider } from "./smtpEmailProvider";

export type EmailProviderStatus = {
  selectedProvider: string;
  simulationMode: boolean;
  smtpConfigured: boolean;
  smtpMissing: string[];
  testEmailOnly: boolean;
  liveCampaignSendingDisabled: boolean;
};

export function getEmailProviderStatus(): EmailProviderStatus {
  const smtp = getSmtpConfigStatus();
  return {
    selectedProvider: getConfiguredProviderName(),
    simulationMode: isSimulationMode(),
    smtpConfigured: smtp.configured,
    smtpMissing: smtp.missing,
    testEmailOnly: true,
    liveCampaignSendingDisabled: true
  };
}

function safeEmailMetadata(result: SendEmailResult) {
  return {
    ok: result.ok,
    provider: result.provider,
    providerMessageId: result.providerMessageId,
    errorMessage: result.errorMessage,
    metadata: result.metadata
  };
}

export async function checkSmtpConfig() {
  const status = getEmailProviderStatus();
  await writeAudit("SMTP config checked", "IntegrationConfig", "smtp", status.smtpConfigured ? "SMTP configuration is present." : "SMTP configuration is missing.", {
    smtpConfigured: status.smtpConfigured,
    missing: status.smtpMissing,
    simulationMode: status.simulationMode
  });
  if (!status.smtpConfigured) {
    await writeAudit("SMTP missing config", "IntegrationConfig", "smtp", "SMTP test email cannot send live because configuration is incomplete.", {
      missing: status.smtpMissing
    });
  }
  return status;
}

export async function sendSmtpTestEmail(input: Pick<SendEmailInput, "to" | "subject" | "body"> & { confirmation: string }): Promise<SendEmailResult> {
  const status = await checkSmtpConfig();
  const recipient = input.to.trim();

  await writeAudit("SMTP test email attempted", "IntegrationConfig", "smtp", "SMTP test email workflow attempted.", {
    recipient,
    simulationMode: status.simulationMode,
    smtpConfigured: status.smtpConfigured
  });

  if (input.confirmation !== "SEND TEST EMAIL") {
    const result = { ok: false, provider: "smtp", errorMessage: "Confirmation phrase did not match." };
    await writeAudit("SMTP test email failed", "IntegrationConfig", "smtp", result.errorMessage, { recipient });
    return result;
  }

  if (!recipient || !recipient.includes("@")) {
    const result = { ok: false, provider: "smtp", errorMessage: "A valid test recipient email is required." };
    await writeAudit("SMTP test email failed", "IntegrationConfig", "smtp", result.errorMessage, { recipient });
    return result;
  }

  if (status.selectedProvider !== "smtp") {
    const result = { ok: false, provider: "smtp", errorMessage: "EMAIL_PROVIDER must be smtp for SMTP test email." };
    await writeAudit("SMTP test email failed", "IntegrationConfig", "smtp", result.errorMessage, { recipient, selectedProvider: status.selectedProvider });
    return result;
  }

  const fromEmail = process.env.SMTP_FROM_EMAIL || "simulation@leadsource.local";
  const fromName = process.env.SMTP_FROM_NAME || "LeadSource Test";
  const message = {
    to: recipient,
    subject: input.subject || "LeadSource SMTP test email",
    body: input.body || "This is a LeadSource SMTP test email. Campaign sending remains disabled.",
    fromEmail,
    fromName,
    metadata: { testEmailOnly: true, campaignSend: false }
  };

  if (status.simulationMode) {
    const result = await simulatedEmailProvider.send(message);
    await writeAudit("SMTP test blocked by simulation mode", "IntegrationConfig", "smtp", "SIMULATE_EMAIL_SENDING=true; test email was simulated only.", safeEmailMetadata(result));
    return result;
  }

  if (!status.smtpConfigured) {
    const result = { ok: false, provider: "smtp", errorMessage: "SMTP configuration is incomplete." };
    await writeAudit("SMTP test email failed", "IntegrationConfig", "smtp", result.errorMessage, { recipient, missing: status.smtpMissing });
    return result;
  }

  const liveSafety = await checkLiveSendingSafety();
  if (!liveSafety.ok) {
    const result = { ok: false, provider: "smtp", errorMessage: liveSafety.reasons.join(" ") };
    await writeAudit("SMTP test email failed", "IntegrationConfig", "smtp", "Domain Guard blocked SMTP test email.", {
      recipient,
      reasons: liveSafety.reasons
    });
    return result;
  }

  const result = await smtpEmailProvider.send(message);
  await writeAudit(result.ok ? "SMTP test email sent" : "SMTP test email failed", "IntegrationConfig", "smtp", result.ok ? "SMTP test email sent." : result.errorMessage ?? "SMTP test email failed.", safeEmailMetadata(result));
  return result;
}
