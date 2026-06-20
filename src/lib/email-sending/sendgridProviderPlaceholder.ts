import { EmailProvider } from "./emailProvider";

export const sendgridProviderPlaceholder: EmailProvider = {
  name: "sendgrid",
  async send() {
    return {
      ok: false,
      provider: "sendgrid",
      errorMessage: process.env.SENDGRID_API_KEY ? "SendGrid provider is a Stage 12 placeholder." : "SENDGRID_API_KEY is not configured."
    };
  }
};
