export type EmailProviderName = "simulation" | "smtp" | "sendgrid" | "mailgun" | "resend" | "instantly" | "smartlead";

export type SendEmailInput = {
  to: string;
  subject: string;
  body: string;
  fromEmail?: string;
  fromName?: string;
  metadata?: Record<string, unknown>;
};

export type SendEmailResult = {
  ok: boolean;
  provider: EmailProviderName | string;
  providerMessageId?: string;
  errorMessage?: string;
  metadata?: Record<string, unknown>;
};

export interface EmailProvider {
  name: EmailProviderName | string;
  send(input: SendEmailInput): Promise<SendEmailResult>;
}

export function isSimulationMode() {
  return process.env.SIMULATE_EMAIL_SENDING !== "false";
}

export function getConfiguredProviderName(): EmailProviderName {
  const provider = (process.env.EMAIL_PROVIDER ?? "smtp").toLowerCase();
  if (["smtp", "sendgrid", "mailgun", "resend", "instantly", "smartlead"].includes(provider)) {
    return provider as EmailProviderName;
  }
  return "smtp";
}
