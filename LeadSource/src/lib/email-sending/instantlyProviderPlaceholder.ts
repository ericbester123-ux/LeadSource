import { EmailProvider } from "./emailProvider";

export const instantlyProviderPlaceholder: EmailProvider = {
  name: "instantly",
  async send() {
    return {
      ok: false,
      provider: "instantly",
      errorMessage: process.env.INSTANTLY_API_KEY ? "Instantly provider is a Stage 12 placeholder." : "INSTANTLY_API_KEY is not configured."
    };
  }
};
