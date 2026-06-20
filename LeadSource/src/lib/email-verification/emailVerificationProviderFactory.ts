import { localEmailSyntaxCheck, EmailVerificationResult } from "./localEmailSyntaxCheck";
import { verifyWithNeverBounce } from "./neverbounceProvider";
import { verifyWithZeroBounce } from "./zerobounceProvider";

export type EmailVerificationProviderName = "local" | "zerobounce" | "neverbounce";

export type EmailVerificationProviderStatus = {
  selectedProvider: EmailVerificationProviderName;
  providerLabel: string;
  apiKeyConfigured: boolean;
  zeroBounceConfigured: boolean;
  neverBounceConfigured: boolean;
  localFallbackOnly: boolean;
};

export type EmailVerificationProvider = {
  name: EmailVerificationProviderName;
  label: string;
  hasApiKey: boolean;
  verify(email: string, bounced?: boolean): Promise<EmailVerificationResult>;
};

export function getSelectedEmailVerificationProvider(): EmailVerificationProviderName {
  const provider = (process.env.EMAIL_VERIFICATION_PROVIDER ?? "local").toLowerCase();
  if (provider === "zerobounce" || provider === "neverbounce") return provider;
  return "local";
}

export function getEmailVerificationProvider(): EmailVerificationProvider {
  const selected = getSelectedEmailVerificationProvider();
  if (selected === "zerobounce") {
    return {
      name: "zerobounce",
      label: "ZeroBounce",
      hasApiKey: Boolean(process.env.ZEROBOUNCE_API_KEY),
      verify: verifyWithZeroBounce
    };
  }
  if (selected === "neverbounce") {
    return {
      name: "neverbounce",
      label: "NeverBounce",
      hasApiKey: Boolean(process.env.NEVERBOUNCE_API_KEY),
      verify: verifyWithNeverBounce
    };
  }
  return {
    name: "local",
    label: "Local syntax check",
    hasApiKey: true,
    verify: async (email, bounced) => localEmailSyntaxCheck(email, bounced)
  };
}

export function getEmailVerificationProviderStatus(): EmailVerificationProviderStatus {
  const provider = getEmailVerificationProvider();
  return {
    selectedProvider: provider.name,
    providerLabel: provider.label,
    apiKeyConfigured: provider.hasApiKey,
    zeroBounceConfigured: Boolean(process.env.ZEROBOUNCE_API_KEY),
    neverBounceConfigured: Boolean(process.env.NEVERBOUNCE_API_KEY),
    localFallbackOnly: provider.name === "local" || !provider.hasApiKey
  };
}
