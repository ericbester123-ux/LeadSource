import { Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FormSection } from "@/components/ui/form-section";
import { Input, Select, Textarea } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { defaultSafetySettings } from "@/lib/settings";
import { validateGhlConfig } from "@/lib/ghl/ghlConfigValidator";
import { getOrCreateDomainGuard } from "@/lib/domain-guard/domainReputationGuard";
import { evaluateLiveSendingGate } from "@/lib/domain-guard/liveSendingGate";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function statusLabel(value?: string | null) {
  return value && value.trim() ? value : "Not configured";
}

export default async function SettingsPage() {
  const simulate = process.env.SIMULATE_EMAIL_SENDING !== "false";
  const provider = process.env.EMAIL_PROVIDER ?? "smtp";
  const ghl = validateGhlConfig();
  const guard = await getOrCreateDomainGuard();
  const liveGate = evaluateLiveSendingGate(guard);
  const recentAuditCount = await prisma.auditLog.count();
  const smtpConfigured = Boolean(process.env.SMTP_HOST && process.env.SMTP_PORT && process.env.SMTP_USER && process.env.SMTP_PASS && process.env.SMTP_FROM_EMAIL);

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h2 className="text-2xl font-semibold">Settings</h2>
          <p className="mt-1 text-sm text-neutral-600">Conservative defaults for safe review-led outreach.</p>
        </div>
        <Button type="button">
          <Save className="h-4 w-4" />
          Settings reviewed
        </Button>
      </div>

      <Card>
        <div className="mb-4 flex flex-wrap gap-2">
          <Badge tone={simulate ? "gold" : "red"}>{simulate ? "SIMULATED MODE" : "LIVE SENDING ENABLED"}</Badge>
          <Badge tone="black">Review Required</Badge>
          <Badge tone="green">Suppression Active</Badge>
          <Badge tone="black">Provider: {provider.toUpperCase()}</Badge>
        </div>

        {!simulate && (
          <div className="mb-5 rounded-md border border-red-200 bg-red-50 p-4 text-sm leading-6 text-red-800">
            Live sending can affect domain reputation and legal compliance. Confirm that SPF, DKIM, DMARC, unsubscribe,
            suppression list, email verification, and compliance checks are configured.
          </div>
        )}

        <FormSection title="Organisation Defaults" description="Default identity and targeting values used by templates and safety checks.">
          <div className="grid gap-4 md:grid-cols-2">
            <label className="grid gap-2 text-sm font-medium">
              Sender name
              <Input readOnly defaultValue={process.env.SENDER_NAME || defaultSafetySettings.senderName} />
            </label>
            <label className="grid gap-2 text-sm font-medium">
              Agency name
              <Input readOnly defaultValue={defaultSafetySettings.agencyName} />
            </label>
            <label className="grid gap-2 text-sm font-medium">
              Website URL
              <Input readOnly defaultValue={defaultSafetySettings.websiteUrl} />
            </label>
            <label className="grid gap-2 text-sm font-medium">
              Calendar booking link
              <Input readOnly defaultValue={defaultSafetySettings.calendarBookingLink} />
            </label>
            <label className="grid gap-2 text-sm font-medium md:col-span-2">
              Business/physical address
              <Input readOnly defaultValue={defaultSafetySettings.businessAddress || "Not configured - required before US live outreach"} />
            </label>
            <label className="grid gap-2 text-sm font-medium">
              Default target countries
              <Input readOnly defaultValue={defaultSafetySettings.defaultTargetCountries} />
            </label>
            <label className="grid gap-2 text-sm font-medium">
              Default industry
              <Input readOnly defaultValue={defaultSafetySettings.defaultIndustry} />
            </label>
            <label className="grid gap-2 text-sm font-medium md:col-span-2">
              Email signature
              <Textarea readOnly rows={4} defaultValue={defaultSafetySettings.emailSignature} />
            </label>
          </div>
        </FormSection>

        <FormSection title="Sending Safety" description="Live sending stays disabled unless explicitly enabled later.">
          <div className="grid gap-4 md:grid-cols-2">
            <label className="grid gap-2 text-sm font-medium">
              Email mode
              <Select defaultValue="simulated">
                <option value="simulated">Simulated</option>
                <option value="live" disabled>Live requires confirmation</option>
              </Select>
            </label>
            <label className="grid gap-2 text-sm font-medium">
              Daily limit per inbox
              <Input readOnly type="number" defaultValue={guard.dailyLimitPerInbox || defaultSafetySettings.dailyLimitPerInbox} />
            </label>
            <label className="grid gap-2 text-sm font-medium">
              Sending window
              <Input readOnly defaultValue={`${guard.sendingWindowStart}-${guard.sendingWindowEnd}`} />
            </label>
            <label className="grid gap-2 text-sm font-medium">
              Sending days
              <Input readOnly defaultValue={guard.sendingDays || defaultSafetySettings.sendingDays} />
            </label>
            <label className="grid gap-2 text-sm font-medium">
              Sending domain
              <Input readOnly defaultValue={guard.sendingDomain || defaultSafetySettings.sendingDomain} />
            </label>
            <label className="grid gap-2 text-sm font-medium">
              Warm-up mode
              <Input readOnly defaultValue={guard.warmupMode ? "Enabled" : "Disabled"} />
            </label>
            <label className="grid gap-2 text-sm font-medium">
              Simulation mode
              <Input readOnly defaultValue={simulate ? "Enabled" : "Disabled"} />
            </label>
          </div>
        </FormSection>

        <FormSection title="Required Checks" description="These checks block unsafe or incomplete sends.">
          <div className="grid gap-3 md:grid-cols-2">
            {[
              "Email verification required",
              "Compliance check required",
              "Unsubscribe link required",
              "Suppression list active",
              "Do-not-contact logic active",
              "Review Required campaign mode",
              "Domain Guard live sending gate",
              "Full audit logs enabled",
              "Compliance disclaimer acknowledged"
            ].map((item) => (
              <label key={item} className="flex items-center gap-3 rounded-md border border-black/10 p-3 text-sm">
                <input type="checkbox" defaultChecked className="h-4 w-4 accent-gold-500" />
                {item}
              </label>
            ))}
          </div>
        </FormSection>

        <FormSection title="Provider Configuration" description="API providers stay as placeholders until their keys and live mode are intentionally configured.">
          <div className="mb-4 grid gap-3 md:grid-cols-3">
            <Badge tone={process.env.OPENAI_API_KEY ? "green" : "gold"}>OpenAI API key {process.env.OPENAI_API_KEY ? "configured" : "missing"}</Badge>
            <Badge tone={smtpConfigured ? "green" : "gold"}>Email provider {smtpConfigured ? "configured" : "simulation-ready"}</Badge>
            <Badge tone={ghl.values.apiKeyConfigured ? "green" : "gold"}>GHL API key {ghl.values.apiKeyConfigured ? "configured" : "missing"}</Badge>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {[
              ["EMAIL_PROVIDER", provider],
              ["SMTP_FROM_EMAIL", statusLabel(process.env.SMTP_FROM_EMAIL)],
              ["SMTP_FROM_NAME", process.env.SMTP_FROM_NAME || defaultSafetySettings.senderName],
              ["SMTP_HOST", statusLabel(process.env.SMTP_HOST)],
              ["SendGrid", process.env.SENDGRID_API_KEY ? "Configured" : "Placeholder"],
              ["Mailgun", process.env.MAILGUN_API_KEY ? "Configured" : "Placeholder"],
              ["Resend", process.env.RESEND_API_KEY ? "Configured" : "Placeholder"],
              ["Instantly", process.env.INSTANTLY_API_KEY ? "Configured" : "Placeholder"],
              ["Smartlead", process.env.SMARTLEAD_API_KEY ? "Configured" : "Placeholder"]
            ].map(([label, value]) => (
              <div key={label} className="rounded-md border border-black/10 p-3 text-sm">
                <div className="text-xs uppercase text-neutral-500">{label}</div>
                <div className="mt-1 font-medium">{value}</div>
              </div>
            ))}
          </div>
        </FormSection>

        <FormSection title="GoHighLevel Configuration" description="Part 1 supports configuration validation and JSON preview only. Live sync is disabled.">
          <div className="mb-4 flex flex-wrap gap-2">
            <Badge tone={ghl.configured ? "green" : "gold"}>{ghl.mode}</Badge>
            <Badge tone={ghl.values.apiKeyConfigured ? "green" : "red"}>API key {ghl.values.apiKeyConfigured ? "configured" : "missing"}</Badge>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {[
              ["GHL location ID", ghl.values.locationId || "Not configured"],
              ["GHL pipeline ID", ghl.values.pipelineId || "Not configured"],
              ["Stage: New Lead", ghl.values.stageNewLead || "Not configured"],
              ["Stage: Interested", ghl.values.stageInterested || "Not configured"],
              ["Stage: Booked", ghl.values.stageBooked || "Not configured"],
              ["Stage: Not Interested", ghl.values.stageNotInterested || "Not configured"],
              ["Auto-sync interested leads", "Enabled in campaign settings"],
              ["Auto-sync booked leads", "Enabled in campaign settings"]
            ].map(([label, value]) => (
              <div key={label} className="rounded-md border border-black/10 p-3 text-sm">
                <div className="text-xs uppercase text-neutral-500">{label}</div>
                <div className="mt-1 font-medium">{value}</div>
              </div>
            ))}
          </div>
        </FormSection>

        <FormSection title="Safety Audit" description="Current enforcement status for outreach guardrails.">
          <div className="grid gap-3 md:grid-cols-2">
            {[
              ["Live sending disabled by default", guard.liveSendingAllowed ? "Needs review" : "Confirmed"],
              ["Simulation mode enabled by default", simulate ? "Confirmed" : "Needs review"],
              ["Review Required mode enabled by default", defaultSafetySettings.reviewRequired ? "Confirmed" : "Needs review"],
              ["Suppressed, unsubscribed, do-not-contact, bounced leads blocked", "Confirmed"],
              ["Invalid or unverified email blocked", "Confirmed"],
              ["Compliance must be Passed before sending", "Confirmed"],
              ["Unsubscribe link required", "Confirmed"],
              ["Business address required for US campaigns", defaultSafetySettings.businessAddress ? "Configured" : "Blocked until configured"],
              ["Domain Guard blocks live sending unless checklist passes", liveGate.allowed ? "Checklist passing" : "Blocking unsafe live sending"],
              ["Live sending requires ENABLE LIVE SENDING confirmation", "Confirmed"],
              ["Important actions audit logged", `${recentAuditCount} audit events recorded`]
            ].map(([label, value]) => (
              <div key={label} className="rounded-md border border-black/10 p-3 text-sm">
                <div className="text-xs uppercase text-neutral-500">{label}</div>
                <div className="mt-1 font-medium">{value}</div>
              </div>
            ))}
          </div>
        </FormSection>
      </Card>
    </div>
  );
}
