import { EmailProvider, SendEmailInput, SendEmailResult } from "./emailProvider";

export const simulatedEmailProvider: EmailProvider = {
  name: "simulation",
  async send(input: SendEmailInput): Promise<SendEmailResult> {
    return {
      ok: true,
      provider: "simulation",
      providerMessageId: `sim_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      metadata: {
        simulated: true,
        recipientEmail: input.to
      }
    };
  }
};
