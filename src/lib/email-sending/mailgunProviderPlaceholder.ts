import { EmailProvider } from "./emailProvider";

export const mailgunProviderPlaceholder: EmailProvider = {
  name: "mailgun",
  async send() {
    return {
      ok: false,
      provider: "mailgun",
      errorMessage: process.env.MAILGUN_API_KEY ? "Mailgun provider is a Stage 12 placeholder." : "MAILGUN_API_KEY is not configured."
    };
  }
};
