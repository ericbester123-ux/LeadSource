import { EmailVerificationResult, localEmailSyntaxCheck } from "./localEmailSyntaxCheck";

type NeverBounceResponse = {
  status?: string;
  result?: string;
  flags?: string[];
  suggested_correction?: string;
  execution_time?: number;
  error?: string;
  message?: string;
};

function mapNeverBounceStatus(response: NeverBounceResponse): EmailVerificationResult {
  const result = (response.result ?? response.status ?? "unknown").toLowerCase();
  const flags = response.flags ?? [];
  const risky = flags.some((flag) => ["disposable", "spamtrap", "abuse", "role_account"].includes(flag.toLowerCase()));

  if (result === "valid") return { status: "Valid", details: "NeverBounce returned valid.", reason: "valid", confidence: 0.95, provider: "neverbounce", metadata: response };
  if (result === "invalid") return { status: "Invalid", details: "NeverBounce returned invalid.", reason: "invalid", confidence: 0.95, provider: "neverbounce", metadata: response };
  if (result === "catchall" || result === "catch-all" || result === "catch_all") return { status: "Catch-All", details: "NeverBounce returned catch-all.", reason: result, confidence: 0.8, provider: "neverbounce", metadata: response };
  if (result === "disposable" || risky) return { status: "Risky", details: "NeverBounce flagged the email as risky.", reason: result, confidence: 0.9, provider: "neverbounce", metadata: response };

  return { status: "Unknown", details: "NeverBounce returned unknown.", reason: result, confidence: 0.5, provider: "neverbounce", metadata: response };
}

export async function verifyWithNeverBounce(email: string, bounced = false): Promise<EmailVerificationResult> {
  if (!process.env.NEVERBOUNCE_API_KEY) {
    return { ...localEmailSyntaxCheck(email, bounced), provider: "local", fallbackUsed: true, details: "NeverBounce API key missing. Local fallback used." };
  }

  try {
    const url = new URL("https://api.neverbounce.com/v4/single/check");
    url.searchParams.set("key", process.env.NEVERBOUNCE_API_KEY);
    url.searchParams.set("email", email);
    const response = await fetch(url, { cache: "no-store" });
    const payload = await response.json() as NeverBounceResponse;
    if (!response.ok || payload.error) throw new Error(payload.error || payload.message || `NeverBounce request failed with ${response.status}.`);
    return mapNeverBounceStatus(payload);
  } catch (error) {
    return {
      ...localEmailSyntaxCheck(email, bounced),
      provider: "local",
      fallbackUsed: true,
      details: "NeverBounce verification failed. Local fallback used.",
      reason: error instanceof Error ? error.message : "neverbounce_failed",
      metadata: { error: error instanceof Error ? error.message : String(error) }
    };
  }
}
