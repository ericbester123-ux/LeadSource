export function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim().toLowerCase());
}

export function buildFullName(firstName?: string | null, lastName?: string | null, fullName?: string | null) {
  const existing = fullName?.trim();
  if (existing) return existing;
  return [firstName, lastName].filter(Boolean).join(" ").trim() || null;
}

export function qualityFromScore(score?: number | null) {
  if (!score) return "Maybe";
  if (score >= 85) return "Hot Fit";
  if (score >= 70) return "Good Fit";
  if (score >= 50) return "Maybe";
  return "Poor Fit";
}

export function formatDate(value?: Date | string | null) {
  if (!value) return "";
  return new Intl.DateTimeFormat("en", { year: "numeric", month: "short", day: "2-digit" }).format(new Date(value));
}

export function csvEscape(value: unknown) {
  const text = value == null ? "" : String(value);
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}
