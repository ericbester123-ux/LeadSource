import { EmailProvider } from "./emailProvider";

export const resendProviderPlaceholder: EmailProvider = {
  name: "resend",
  async send() {
    return {
      ok: false,
      provider: "resend",
      errorMessage: process.env.RESEND_API_KEY ? "Resend provider is a Stage 12 placeholder." : "RESEND_API_KEY is not configured."
    };
  }
};
