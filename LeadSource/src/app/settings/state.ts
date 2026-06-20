export type SmtpTestEmailState = {
  ok?: boolean;
  message?: string;
  provider?: string;
  providerMessageId?: string;
};

export const initialSmtpTestEmailState: SmtpTestEmailState = {};
