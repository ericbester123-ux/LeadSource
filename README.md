# LeadSource

LeadSource is an internal lead sourcing, scoring, verification, outreach review, and CRM handoff system for Estates Elevate.

Estates Elevate helps UK and US real estate agencies improve lead follow-up, appointment booking, and pipeline management. LeadSource is built to support that business context with a controlled B2B workflow: discover relevant real estate businesses, score fit, verify email quality, run compliance checks, queue outreach for review, process email sends in simulation mode, track replies, and prepare interested or booked leads for GoHighLevel.

LeadSource is not designed as a spam tool. The default operating mode is conservative, review-led, and simulation-first.

## Main Workflow

1. Discover or import real estate leads.
2. Review and enrich lead records.
3. Score leads with local placeholder AI or OpenAI later.
4. Verify email syntax locally or connect verification APIs later.
5. Run compliance and suppression checks.
6. Approve leads and enroll them in a campaign.
7. Generate a sending queue in Review Required mode.
8. Process the queue in simulated mode.
9. Track replies manually.
10. Stop follow-ups after replies, bookings, bounces, unsubscribes, or suppression.
11. Prepare interested or booked leads for GoHighLevel preview mode.

## Tech Stack

- Next.js App Router
- React
- TypeScript
- Tailwind CSS
- Prisma
- SQLite for local development
- Local placeholder providers for discovery, AI scoring, verification, email sending, and GHL preview mode

## Setup

```powershell
npm.cmd install
Copy-Item .env.example .env
npx.cmd prisma generate
npx.cmd prisma migrate dev
npm.cmd run seed
npm.cmd run dev
```

The app runs locally at:

```text
http://localhost:3000
```

## Environment Variables

Start from `.env.example`.

```env
DATABASE_URL="file:./dev.db"

OPENAI_API_KEY=

GOOGLE_PLACES_API_KEY=
SERP_API_KEY=
APOLLO_API_KEY=
CLAY_API_KEY=
PEOPLEDATALABS_API_KEY=

NEVERBOUNCE_API_KEY=
ZEROBOUNCE_API_KEY=
DEBOUNCE_API_KEY=

EMAIL_PROVIDER=smtp
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
SMTP_FROM_EMAIL=
SMTP_FROM_NAME=

SENDGRID_API_KEY=
MAILGUN_API_KEY=
RESEND_API_KEY=
INSTANTLY_API_KEY=
SMARTLEAD_API_KEY=

SIMULATE_EMAIL_SENDING=true

GHL_API_KEY=
GHL_LOCATION_ID=
GHL_PIPELINE_ID=
GHL_STAGE_NEW_LEAD=
GHL_STAGE_INTERESTED=
GHL_STAGE_BOOKED=
GHL_STAGE_NOT_INTERESTED=
```

Keep `SIMULATE_EMAIL_SENDING=true` unless the Domain Guard checklist is complete and live sending has been intentionally enabled.

## Common Commands

```powershell
npm.cmd run dev
npm.cmd run build
npx.cmd prisma format
npx.cmd prisma generate
npx.cmd prisma migrate dev
npm.cmd run seed
```

## Migrations

Create and apply local migrations with:

```powershell
npx.cmd prisma migrate dev
```

Regenerate Prisma Client after schema changes:

```powershell
npx.cmd prisma generate
```

## Seed Data

Load fake UK and US real estate leads, a default campaign, campaign steps, settings, email verification records, lead scores, compliance checks, and safety defaults with:

```powershell
npm.cmd run seed
```

## Simulated Sending

Simulated sending is the default.

- `SIMULATE_EMAIL_SENDING=true`
- No SMTP/API email is sent.
- Queue processing creates `EmailSendLog` records with simulated status.
- Safety checks still run before simulated sends.

Use this mode for local QA, workflow testing, and campaign review.

## Enabling SMTP Later

Live SMTP sending is intentionally blocked by default. Before enabling it later:

1. Set `SIMULATE_EMAIL_SENDING=false`.
2. Configure `EMAIL_PROVIDER=smtp`.
3. Configure `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM_EMAIL`, and `SMTP_FROM_NAME`.
4. Complete Domain Guard SPF, DKIM, DMARC, business address, unsubscribe, suppression, verification, compliance, and sending limit checks.
5. Type `ENABLE LIVE SENDING` in the Domain Guard live sending confirmation modal.

Live sending can affect sender reputation and compliance posture. Increase limits slowly.

## Adding OpenAI Later

Set:

```env
OPENAI_API_KEY=
```

The scoring services are structured to route to OpenAI when a key exists. Without a key, LeadSource uses local placeholder scoring.

## Adding Lead Provider APIs Later

Provider placeholders exist for:

- Google Places
- Website search
- Website contact page finding
- Manual CSV
- Apollo
- Clay
- People Data Labs
- SerpApi
- LinkedIn manual workflows

Add keys in `.env` and implement provider-specific API calls inside the provider files. Do not scrape platforms in ways that violate terms.

## Adding Email Verification APIs Later

Local syntax checks are implemented now. Placeholders exist for:

- NeverBounce
- ZeroBounce
- DeBounce

Add keys in `.env`, then route verification requests through the provider adapters. Keep local syntax checks as a fallback.

## Connecting GoHighLevel Later

Current GHL behavior supports configuration validation, payload mapping, JSON preview mode, Ready for GHL workflow, and safe placeholder sync architecture.

Set:

```env
GHL_API_KEY=
GHL_LOCATION_ID=
GHL_PIPELINE_ID=
GHL_STAGE_NEW_LEAD=
GHL_STAGE_INTERESTED=
GHL_STAGE_BOOKED=
GHL_STAGE_NOT_INTERESTED=
```

If credentials are missing, LeadSource remains in Preview Mode and does not fail. Interested and booked leads can be prepared for GHL and previewed as JSON.

## UK/US Compliance Notes

- Use public business contact data only.
- Keep suppression and unsubscribe systems active.
- Include an unsubscribe link in every outreach email.
- Keep compliance checks active before sending.
- Keep email verification active before sending.
- For US outreach, include a valid business or physical address.
- For UK outreach, document legitimate interest and keep targeting relevant to business recipients.
- Stop follow-ups after unsubscribe, bounce, do-not-contact, not interested, reply, or booking events.

## Domain Reputation Checklist

Before live sending:

- Use a dedicated outreach domain.
- Configure SPF.
- Configure DKIM.
- Configure DMARC.
- Configure a business address.
- Keep unsubscribe links active.
- Keep suppression list active.
- Keep email verification active.
- Keep compliance checks active.
- Keep daily sending limits configured.
- Use warm-up mode.
- Keep sending windows conservative.

## Recommended Safe Sending Limits

- Default: 20 emails per inbox per day.
- Warm-up slowly.
- Monday to Friday only.
- 09:00 to 15:30 recipient-local sending window.
- Avoid increasing above 50 emails per inbox per day without a deliberate reputation review.
- Pause campaigns if bounce or unsubscribe rates exceed thresholds.

## Legal Disclaimer

“LeadSource provides operational compliance checks and workflow guardrails, but it is not legal advice. Review your outreach process with a qualified legal professional before running live campaigns.”

## Current Safety Defaults

- Live sending disabled by default.
- Simulation mode enabled by default.
- Review Required mode enabled by default.
- Suppressed, unsubscribed, do-not-contact, bounced, invalid, risky, unknown, catch-all, and compliance-failed leads are blocked.
- Email verification is required before sending.
- Compliance check must be `Passed` before sending.
- Domain Guard blocks live sending unless safety checks pass.
- Live sending requires typing `ENABLE LIVE SENDING`.
- Audit logs are created for important actions.
