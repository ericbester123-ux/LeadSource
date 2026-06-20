import { localEmailSyntaxCheck, type EmailVerificationResult } from "./localEmailSyntaxCheck";

export type EmailVerificationProviderName = "local" | "zerobounce" | "neverbounce";

export type EmailVerificationProviderStatus = {
  requestedProvider: string;
  activeProvider: EmailVerificationProviderName;
  zeroBounceConfigured: boolean;
  neverBounceConfigured: boolean;
  localFallbackActive: boolean;
  warning?: string;
};

export type ProviderVerificationResult = EmailVerificationResult & {
  provider: EmailVerificationProviderName;
  warning?: string;
};

function configured(value?: string) {
  return Boolean(value && value.trim());
}

export function getEmailVerificationProviderStatus(): EmailVerificationProviderStatus {
  const requestedProvider = (process.env.EMAIL_VERIFICATION_PROVIDER ?? "local").trim().toLowerCase();
  const zeroBounceConfigured = configured(process.env.ZEROBOUNCE_API_KEY);
  const neverBounceConfigured = configured(process.env.NEVERBOUNCE_API_KEY);

  if (requestedProvider === "zerobounce") {
    if (zeroBounceConfigured) {
      return { requestedProvider, activeProvider: "zerobounce", zeroBounceConfigured, neverBounceConfigured, localFallbackActive: false };
    }
    return {
      requestedProvider,
      activeProvider: "local",
      zeroBounceConfigured,
      neverBounceConfigured,
      localFallbackActive: true,
      warning: "ZeroBounce was requested, but ZEROBOUNCE_API_KEY is missing. Local syntax fallback is active."
    };
  }

  if (requestedProvider === "neverbounce") {
    if (neverBounceConfigured) {
      return { requestedProvider, activeProvider: "neverbounce", zeroBounceConfigured, neverBounceConfigured, localFallbackActive: false };
    }
    return {
      requestedProvider,
      activeProvider: "local",
      zeroBounceConfigured,
      neverBounceConfigured,
      localFallbackActive: true,
      warning: "NeverBounce was requested, but NEVERBOUNCE_API_KEY is missing. Local syntax fallback is active."
    };
  }

  return {
    requestedProvider,
    activeProvider: "local",
    zeroBounceConfigured,
    neverBounceConfigured,
    localFallbackActive: true,
    warning: "Local check only validates email format. It does not confirm deliverability."
  };
}

async function verifyWithZeroBounce(email: string, bounced: boolean): Promise<ProviderVerificationResult> {
  const syntax = localEmailSyntaxCheck(email, bounced);
  if (syntax.status === "Invalid") return { ...syntax, provider: "zerobounce" };

  if ((process.env.ZEROBOUNCE_API_KEY ?? "").trim().toLowerCase() === "configured") {
    return {
      status: "Unknown",
      details: "ZeroBounce provider selected, but the configured API key is a placeholder. Real provider verification required.",
      provider: "zerobounce"
    };
  }

  return {
    status: "Unknown",
    details: "ZeroBounce provider selected. Live API verification is not available in this local environment.",
    provider: "zerobounce"
  };
}

async function verifyWithNeverBounce(email: string, bounced: boolean): Promise<ProviderVerificationResult> {
  const syntax = localEmailSyntaxCheck(email, bounced);
  if (syntax.status === "Invalid") return { ...syntax, provider: "neverbounce" };

  if ((process.env.NEVERBOUNCE_API_KEY ?? "").trim().toLowerCase() === "configured") {
    return {
      status: "Unknown",
      details: "NeverBounce provider selected, but the configured API key is a placeholder. Real provider verification required.",
      provider: "neverbounce"
    };
  }

  return {
    status: "Unknown",
    details: "NeverBounce provider selected. Live API verification is not available in this local environment.",
    provider: "neverbounce"
  };
}

export async function verifyEmailAddress(email: string, bounced = false): Promise<ProviderVerificationResult> {
  const status = getEmailVerificationProviderStatus();
  if (status.activeProvider === "zerobounce") return verifyWithZeroBounce(email, bounced);
  if (status.activeProvider === "neverbounce") return verifyWithNeverBounce(email, bounced);
  return { ...localEmailSyntaxCheck(email, bounced), provider: "local", warning: status.warning };
}

export function isQueueSafeEmailVerification(input?: { status: string; provider: string; manuallyApproved: boolean } | null) {
  if (!input) return false;
  if (input.manuallyApproved && input.status !== "Invalid") return true;
  return input.status === "Valid" && ["zerobounce", "neverbounce"].includes(input.provider);
}
