import { isValidEmail } from "@/lib/lead-utils";

export type EmailVerificationResult = {
  status: "Valid" | "Invalid" | "Risky" | "Catch-All" | "Unknown";
  details: string;
  reason?: string;
  confidence?: number;
  metadata?: unknown;
  provider?: string;
  fallbackUsed?: boolean;
};

export function localEmailSyntaxCheck(email: string, bounced = false): EmailVerificationResult {
  if (bounced) return { status: "Invalid", details: "Lead has previously bounced.", reason: "previous_bounce", confidence: 1, provider: "local" };
  if (!isValidEmail(email)) return { status: "Invalid", details: "Email syntax is invalid.", reason: "invalid_syntax", confidence: 1, provider: "local" };
  const domain = email.split("@")[1]?.toLowerCase() ?? "";
  if (["gmail.com", "yahoo.com", "outlook.com", "icloud.com", "hotmail.com"].includes(domain)) {
    return { status: "Risky", details: "Personal mailbox domain needs manual approval for B2B outreach.", reason: "personal_mailbox", confidence: 0.8, provider: "local" };
  }
  if (email.startsWith("admin@") || email.startsWith("support@")) {
    return { status: "Unknown", details: "Generic role address accepted syntactically but needs context review.", reason: "role_address", confidence: 0.6, provider: "local" };
  }
  return { status: "Valid", details: "Local syntax check passed.", reason: "syntax_passed", confidence: 0.7, provider: "local" };
}
