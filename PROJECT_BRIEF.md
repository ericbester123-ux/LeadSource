# LeadSource Project Brief

## App Name

LeadSource

## Brand

LeadSource by Estates Elevate

## Business Context

Estates Elevate helps real estate agents get more booked buyer and seller appointments using:

- Paid Facebook and Instagram ads
- AI lead follow-up
- AI calling
- CRM automation
- Appointment booking
- GoHighLevel systems

LeadSource is an internal AI lead sourcing and cold email automation platform for Estates Elevate.

## Main Target Market

LeadSource will mainly target:

- Real estate agents in the United Kingdom
- Estate agents in the United Kingdom
- Real estate brokers in the United States
- Real estate agencies in the United States
- Letting agents
- Property agencies
- Boutique real estate firms
- Luxury real estate agencies

## Main Goal

The app should help Estates Elevate find potential real estate clients in the UK and US, verify their emails, run compliance checks, send controlled daily cold email outreach, and sync interested/booked leads into GoHighLevel.

## Main Workflow

AI finds possible leads  
→ AI scores them  
→ Email gets verified  
→ App checks compliance/do-not-contact/suppression status  
→ App queues a small daily email batch  
→ App sends emails within safe limits  
→ App stops follow-ups when someone replies, books, unsubscribes, or bounces  
→ Interested/booked leads sync to GoHighLevel

## Important Safety Requirement

This must not be built as a spam tool.

LeadSource must be built as a controlled, compliant B2B outreach system with conservative defaults.

Default settings must be:

- Simulation mode ON
- Review Required mode ON
- No live email sending unless manually enabled
- Conservative daily sending limits
- Email verification required before sending
- Compliance check required before sending
- Unsubscribe link required in every email
- Suppression list active
- Do-not-contact logic active
- Full audit logs enabled

## Tech Stack

Use:

- Next.js
- React
- TypeScript
- Tailwind CSS
- Prisma ORM
- PostgreSQL preferred
- SQLite allowed for local development
- Background jobs / queue system
- Cron-based daily jobs
- Modular service architecture

## Design Style

Create a clean SaaS dashboard with a premium theme.

Theme:

- Black
- White
- Gold
- Modern
- Professional
- Minimal
- Desktop-first
- Responsive layout

Navigation should include:

- Dashboard
- Lead Discovery
- Leads
- Import CSV
- AI Lead Scoring
- Email Verification
- Campaigns
- Campaign Builder
- Email Builder
- Sending Queue
- Replies
- Bookings
- GoHighLevel Sync
- Compliance
- Suppression List
- Domain Guard
- Settings
- Audit Logs

## Core Features

### Dashboard

The dashboard must show:

Lead sourcing metrics:

- Leads discovered today
- Leads discovered this week
- Leads approved
- Leads rejected
- Average AI lead score
- Hot Fit leads
- Good Fit leads
- Poor Fit leads

Email metrics:

- Emails queued today
- Emails sent today
- Emails skipped today
- Daily sending limit remaining
- Bounce count
- Unsubscribe count
- Reply count
- Positive reply count
- Booking count
- Reply rate
- Booking rate

Compliance metrics:

- Suppressed contacts
- Do-not-contact contacts
- Unsubscribed contacts
- Compliance warnings
- Leads missing source URL
- Leads missing lawful basis notes
- Leads missing email verification

GoHighLevel metrics:

- Contacts ready for GHL
- Contacts synced to GHL
- GHL sync errors
- Booked appointments synced

---

## Lead Discovery Engine

The app must allow me to search for leads using:

- Country
- City
- Region
- State
- Industry
- Niche
- Keywords
- Company type
- Minimum lead score
- Maximum leads per day

Example searches:

- real estate agents London UK
- estate agents Manchester UK
- letting agents Birmingham UK
- real estate brokers Miami USA
- real estate agents Dallas USA
- property agencies New York USA
- real estate brokers Los Angeles USA
- luxury real estate agents Florida
- estate agents UK sellers landlords

Lead discovery must store:

- Company name
- Website
- Public email if found
- Phone number if found
- Location
- City
- State/region
- Country
- Industry
- Niche
- Source URL
- Source platform
- Date discovered
- Discovery query
- Confidence score
- Notes
- Public profile URL if available
- Social links if available
- Contact page URL if found

Important lead discovery rules:

- Do not scrape platforms in ways that violate their terms.
- Prefer official websites, Google Places API, business directories with public business data, manual CSV imports, and approved APIs.
- Store the exact source URL where the business/contact was found.
- Store the date collected.
- Store whether the email appears to be a generic business email or a personal/named email.

Create provider files:

- googlePlacesProvider.ts
- websiteSearchProvider.ts
- websiteContactPageFinder.ts
- manualCsvProvider.ts
- apolloProviderPlaceholder.ts
- clayProviderPlaceholder.ts
- peopleDataLabsProviderPlaceholder.ts
- serpApiProviderPlaceholder.ts
- linkedinManualProviderPlaceholder.ts

Environment variables:

- GOOGLE_PLACES_API_KEY
- SERP_API_KEY
- APOLLO_API_KEY
- CLAY_API_KEY
- PEOPLEDATALABS_API_KEY

For version 1:

- If no API keys are provided, use mock discovery data and manual CSV import.
- Do not block the app if lead provider API keys are missing.
- Build clean placeholders for future integrations.

---

## AI Lead Scoring

Create an AI scoring system that scores each lead from 1 to 100.

Lead quality labels:

- Hot Fit: 85–100
- Good Fit: 70–84
- Maybe: 50–69
- Poor Fit: 1–49
- Do Not Contact: manually assigned or compliance failure

AI scoring criteria:

- Is the business clearly a real estate agency, estate agent, broker, or letting agent?
- Is the business located in the UK or US?
- Does the company work with buyers, sellers, landlords, tenants, or property listings?
- Does the website appear active?
- Does the business have a public contact method?
- Does the business have a visible business email?
- Is there evidence that lead generation, follow-up, or booking automation could be useful?
- Is there a strong personalisation angle?
- Is the lead likely to be relevant for Estates Elevate?

AI-generated fields:

- Lead score
- Lead quality label
- Reason for score
- Personalisation first line
- Suggested pain point
- Suggested offer angle
- Suggested subject line
- Suggested first email
- Recommended campaign
- Compliance risk notes

Use OpenAI if OPENAI_API_KEY is provided.

If no API key is provided, use a local placeholder scoring function.

Create AI service files:

- aiLeadScoringService.ts
- aiPersonalisationService.ts
- aiComplianceRiskService.ts
- openAiProvider.ts
- localAiPlaceholder.ts

Environment variable:

- OPENAI_API_KEY

---

## Email Verification

Add email verification before any email can be sent.

Email verification statuses:

- Not Checked
- Valid
- Invalid
- Risky
- Catch-All
- Unknown

Rules:

- Do not send to Invalid emails.
- Do not send to Risky emails unless manually approved.
- Do not send to Unknown emails unless manually approved.
- Do not send to Catch-All emails unless manually approved.
- Do not send to emails that have previously bounced.
- Prevent duplicate emails.

Create provider files:

- localEmailSyntaxCheck.ts
- neverbounceProviderPlaceholder.ts
- zerobounceProviderPlaceholder.ts
- debounceProviderPlaceholder.ts

Environment variables:

- NEVERBOUNCE_API_KEY
- ZEROBOUNCE_API_KEY
- DEBOUNCE_API_KEY

For version 1:

- Implement syntax validation locally.
- Add provider placeholders for real verification APIs.
- Store verification result and verification date.
- Allow manual override with audit log.

---

## Campaign Builder

Create campaign automation with both review mode and auto-pilot mode.

Campaign modes:

- Draft
- Review Required
- Active Manual
- Active Auto-Pilot
- Paused
- Completed

Default mode:

- Review Required

Campaign settings:

- Campaign name
- Target country
- Target locations
- Target industry
- Target niche
- Minimum lead score
- Maximum leads discovered per day
- Maximum emails sent per day
- Sending inbox
- Sending window
- Sending days
- Require manual approval before send boolean
- Auto-enroll leads boolean
- Stop on reply boolean
- Stop on booking boolean
- Stop on unsubscribe boolean
- Stop on bounce boolean
- Sync interested leads to GHL boolean
- Sync booked leads to GHL boolean

Default campaign:

Name:

UK and US Real Estate Agents

Target:

Real estate agents, estate agents, brokers, letting agents, and property agencies in the UK and US.

Offer:

AI lead follow-up and booked appointment system for real estate agents.

Minimum lead score:

75

Maximum leads discovered per day:

50

Maximum emails sent per day:

20 per inbox

Sending window:

09:00 to 15:30 local time of target country, Monday to Friday

Campaign mode:

Review Required

---

## Sending Queue

Create a controlled daily sending queue.

Queue statuses:

- Queued
- Ready for Review
- Approved
- Scheduled
- Sent
- Failed
- Skipped
- Stopped
- Suppressed

Sending rules:

- Default simulate sending mode must be ON.
- Do not send unless SIMULATE_EMAIL_SENDING=false.
- Do not send more than the configured daily limit.
- Do not send outside the sending window.
- Do not send on weekends by default.
- Do not send to suppressed contacts.
- Do not send to unsubscribed contacts.
- Do not send to do-not-contact contacts.
- Do not send to bounced contacts.
- Do not send to invalid emails.
- Do not send to compliance-failed contacts.
- Do not send to leads below the campaign minimum score unless manually approved.
- Randomise send times within the sending window.
- Add delay between sends.
- Keep audit log of every send, skip, block, and failure.
- If a campaign is paused, stop sending.
- If a lead replies, stop all future follow-ups.
- If a lead books, stop all future follow-ups.
- If a lead unsubscribes, stop all future follow-ups.
- If a lead bounces, stop all future follow-ups.

Default safe sending:

- 20 emails per inbox per day
- Monday to Friday only
- 09:00–15:30 recipient local time
- Random delay between emails
- Daily limit can be changed in settings, but warn the user if increasing above 50 per inbox per day

---

## Email Sending Provider

Create provider-based sending.

Providers:

- SMTP
- SendGrid placeholder
- Mailgun placeholder
- Resend placeholder
- Instantly API placeholder
- Smartlead API placeholder

Environment variables:

- EMAIL_PROVIDER
- SMTP_HOST
- SMTP_PORT
- SMTP_USER
- SMTP_PASS
- SMTP_FROM_EMAIL
- SMTP_FROM_NAME
- SENDGRID_API_KEY
- MAILGUN_API_KEY
- RESEND_API_KEY
- INSTANTLY_API_KEY
- SMARTLEAD_API_KEY
- SIMULATE_EMAIL_SENDING

Default:

- SIMULATE_EMAIL_SENDING=true

For version 1:

- Implement SMTP sending only if credentials are provided.
- Otherwise log emails in simulate mode.
- Add clear UI badge showing whether sending is LIVE or SIMULATED.
- Add extra confirmation before enabling live sending.

---

## Domain Reputation Guard

Create a domain reputation guard module.

Settings:

- Sending domain
- SPF configured boolean
- DKIM configured boolean
- DMARC configured boolean
- Custom tracking domain configured boolean
- Daily limit per inbox
- Warm-up mode boolean
- Bounce threshold
- Complaint threshold placeholder
- Unsubscribe threshold

Domain safety rules:

- Warn if SPF/DKIM/DMARC are not marked configured.
- Warn if live sending is enabled without domain checklist complete.
- Pause campaign automatically if bounce rate exceeds threshold.
- Pause campaign automatically if unsubscribe rate exceeds threshold.
- Warn against high daily sending volumes.
- Default daily limit must be conservative.

Create domain reputation checklist:

- SPF configured
- DKIM configured
- DMARC configured
- Dedicated sending domain
- Business address added
- Unsubscribe link enabled
- Email verification enabled
- Sending limits configured
- Suppression list active

---

## Reply Tracking

Add reply tracking architecture.

For version 1:

- Allow manual reply marking.
- Add placeholder for Gmail/IMAP reply tracking.
- Add placeholder for webhook-based reply tracking from sending providers.

Reply statuses:

- No Reply
- Positive
- Neutral
- Not Interested
- Unsubscribe Request
- Angry
- Out of Office
- Referral
- Booked

Reply fields:

- repliedAt
- replyStatus
- replySentiment
- replySummary
- rawReplyBody
- manualNotes

Rules:

- Positive reply → stop sequence, mark Interested, prepare for GHL.
- Booked reply → stop sequence, mark Booked Appointment, sync to GHL.
- Not interested → stop sequence, add suppression reason Not Interested.
- Unsubscribe request → unsubscribe, do-not-contact, suppress.
- Angry reply → do-not-contact, suppress.
- Out of office → pause follow-up and reschedule.
- Referral → allow user to create a new lead from referral.

---

## Database Models

Create/update Prisma models:

- User
- Lead
- LeadSource
- LeadDiscoveryRun
- LeadScore
- EmailVerification
- ComplianceCheck
- Campaign
- CampaignStep
- CampaignEnrollment
- EmailTemplate
- SendingInbox
- SendingQueueItem
- EmailSendLog
- OutreachActivity
- Reply
- Booking
- SuppressionListEntry
- Settings
- IntegrationConfig
- DomainReputationCheck
- GHLSyncLog
- AuditLog

AuditLog fields:

- id
- userId
- action
- entityType
- entityId
- reason
- metadata
- createdAt

---

## Environment Variables

Create `.env.example` with:

```env
DATABASE_URL=

OPENAI_API_KEY=

GOOGLE_PLACES_API_KEY=
SERP_API_KEY=
APOLLO_API_KEY=
CLAY_API_KEY=
PEOPLEDATALABS_API_KEY=

NEVERBOUNCE_API_KEY=
ZEROBOUNCE_API_KEY=
DEBOUNCE_API_KEY=

EMAIL_PROVIDER=
SMTP_HOST=
SMTP_PORT=
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
