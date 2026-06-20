import { EmailProvider } from "./emailProvider";

export const smartleadProviderPlaceholder: EmailProvider = {
  name: "smartlead",
  async send() {
    return {
      ok: false,
      provider: "smartlead",
      errorMessage: process.env.SMARTLEAD_API_KEY ? "Smartlead provider is a Stage 12 placeholder." : "SMARTLEAD_API_KEY is not configured."
    };
  }
};
