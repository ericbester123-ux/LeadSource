import { isValidEmail } from "@/lib/lead-utils";

export type EmailVerificationResult = {
  status: "Valid" | "Invalid" | "Risky" | "Catch-All" | "Unknown";
  details: string;
};

export function localEmailSyntaxCheck(email: string, bounced = false): EmailVerificationResult {
  if (bounced) return { status: "Invalid", details: "Lead has previously bounced." };
  if (!isValidEmail(email)) return { status: "Invalid", details: "Email syntax is invalid." };
  const domain = email.split("@")[1]?.toLowerCase() ?? "";
  if (["gmail.com", "yahoo.com", "outlook.com", "icloud.com", "hotmail.com"].includes(domain)) {
    return { status: "Risky", details: "Personal mailbox domain needs manual approval for B2B outreach." };
  }
  if (email.startsWith("admin@") || email.startsWith("support@")) {
    return { status: "Unknown", details: "Generic role address accepted syntactically but needs context review." };
  }
  return { status: "Valid", details: "Local syntax check passed." };
}
