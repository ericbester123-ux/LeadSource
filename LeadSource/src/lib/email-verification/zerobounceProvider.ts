import { EmailVerificationResult, localEmailSyntaxCheck } from "./localEmailSyntaxCheck";

type ZeroBounceResponse = {
  address?: string;
  status?: string;
  sub_status?: string;
  free_email?: boolean;
  did_you_mean?: string | null;
  domain?: string;
  mx_found?: string;
  smtp_provider?: string;
  firstname?: string;
  lastname?: string;
  gender?: string;
  country?: string;
  region?: string;
  city?: string;
  zipcode?: string;
  processed_at?: string;
  error?: string;
};

function mapZeroBounceStatus(response: ZeroBounceResponse): EmailVerificationResult {
  const status = response.status?.toLowerCase() ?? "unknown";
  const subStatus = response.sub_status?.toLowerCase() ?? "";
  const riskySubStatuses = ["abuse", "spamtrap", "disposable", "toxic", "role_based", "role_based_catch_all", "global_suppression"];

  if (status === "valid") return { status: "Valid", details: "ZeroBounce returned valid.", reason: response.sub_status || "valid", confidence: 0.95, provider: "zerobounce", metadata: response };
  if (status === "invalid") return { status: "Invalid", details: "ZeroBounce returned invalid.", reason: response.sub_status || "invalid", confidence: 0.95, provider: "zerobounce", metadata: response };
  if (status === "catch-all" || status === "catch_all") return { status: "Catch-All", details: "ZeroBounce returned catch-all.", reason: response.sub_status || "catch_all", confidence: 0.8, provider: "zerobounce", metadata: response };
  if (status === "do_not_mail" || riskySubStatuses.includes(subStatus)) return { status: "Risky", details: "ZeroBounce flagged the email as risky.", reason: response.sub_status || status, confidence: 0.9, provider: "zerobounce", metadata: response };
  if (status === "spamtrap" || status === "abuse" || status === "disposable") return { status: "Risky", details: "ZeroBounce flagged a risky mailbox type.", reason: status, confidence: 0.9, provider: "zerobounce", metadata: response };

  return { status: "Unknown", details: "ZeroBounce returned unknown.", reason: response.sub_status || status, confidence: 0.5, provider: "zerobounce", metadata: response };
}

export async function verifyWithZeroBounce(email: string, bounced = false): Promise<EmailVerificationResult> {
  if (!process.env.ZEROBOUNCE_API_KEY) {
    return { ...localEmailSyntaxCheck(email, bounced), provider: "local", fallbackUsed: true, details: "ZeroBounce API key missing. Local fallback used." };
  }

  try {
    const url = new URL("https://api.zerobounce.net/v2/validate");
    url.searchParams.set("api_key", process.env.ZEROBOUNCE_API_KEY);
    url.searchParams.set("email", email);
    const response = await fetch(url, { cache: "no-store" });
    const payload = await response.json() as ZeroBounceResponse;
    if (!response.ok || payload.error) throw new Error(payload.error || `ZeroBounce request failed with ${response.status}.`);
    return mapZeroBounceStatus(payload);
  } catch (error) {
    return {
      ...localEmailSyntaxCheck(email, bounced),
      provider: "local",
      fallbackUsed: true,
      details: `ZeroBounce verification failed. Local fallback used.`,
      reason: error instanceof Error ? error.message : "zerobounce_failed",
      metadata: { error: error instanceof Error ? error.message : String(error) }
    };
  }
}
