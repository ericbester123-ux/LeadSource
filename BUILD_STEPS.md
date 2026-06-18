
---

## 2. `BUILD_STEPS.md`

```md
# LeadSource Build Steps

Build LeadSource in clear stages.

Do not try to build everything at once.

The app must work after each stage.

---

## Stage 1: Project Setup

Set up the base app.

Use:

- Next.js
- React
- TypeScript
- Tailwind CSS
- Prisma ORM
- PostgreSQL preferred
- SQLite allowed for local development

Create:

- App layout
- Sidebar navigation
- Dashboard shell
- Theme system
- Reusable UI components
- Prisma schema
- Seed file
- `.env.example`
- README.md

Create reusable components:

- Button
- Card
- Table
- Badge
- Modal
- Input
- Select
- Textarea
- Form section
- Empty state
- Loading state
- Confirmation modal
- Status badge

Use a black, white, and gold premium theme.

Navigation:

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

---

## Stage 2: Database and Seed Data

Create Prisma models:

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

Add seed data:

- 5 fake UK real estate leads
- 5 fake US real estate leads
- Default campaign
- Default 5-step email sequence
- Default settings
- Sample suppression list entries
- Sample GHL stages

---

## Stage 3: Leads Page

Build the leads page.

Fields to display:

- First name
- Last name
- Full name
- Email
- Phone
- Company name
- Website
- Location
- City
- State/region
- Country
- Industry
- Niche
- Lead source
- Source URL
- Personalisation note
- AI lead score
- Lead quality label
- Compliance status
- Contact type
- Email verification status
- Last contacted date
- Next follow-up date
- Campaign assigned
- Tags
- Notes
- Do-not-contact boolean
- Unsubscribed boolean
- Bounced boolean
- GHL sync status
- Created date
- Updated date

Lead statuses:

- New
- Discovered
- Scored
- Verified
- Compliance Passed
- Ready for Review
- Approved
- Queued
- Contacted
- Follow Up Due
- Replied
- Interested
- Booked Appointment
- Not Interested
- Do Not Contact
- Unsubscribed
- Bounced
- Synced to GHL

Add support for:

- Search
- Filter by country
- Filter by city
- Filter by status
- Filter by score
- Filter by campaign
- Filter by compliance status
- Filter by verification status
- Filter by GHL status
- Bulk approve
- Bulk reject
- Bulk verify
- Bulk score
- Bulk assign campaign
- Bulk suppress
- Bulk sync to GHL
- Export CSV

---

## Stage 4: CSV Import

Create CSV import for manual lead lists.

Features:

- Upload CSV
- Preview rows
- Map columns to fields
- Validate required fields
- Prevent duplicate emails
- Check suppression list before import
- Show invalid emails
- Import only valid rows
- Show import summary

Required fields:

- Email
- Company name or full name
- Country

Import summary:

- Total rows
- Imported rows
- Skipped duplicates
- Skipped suppressed
- Invalid emails
- Missing required fields

---

## Stage 5: Lead Discovery Engine

Build lead discovery.

Create provider architecture:

- googlePlacesProvider.ts
- websiteSearchProvider.ts
- websiteContactPageFinder.ts
- manualCsvProvider.ts
- apolloProviderPlaceholder.ts
- clayProviderPlaceholder.ts
- peopleDataLabsProviderPlaceholder.ts
- serpApiProviderPlaceholder.ts
- linkedinManualProviderPlaceholder.ts

For version 1:

- Use mock discovery data if API keys are missing.
- Add manual discovery form.
- Store source URL.
- Store source platform.
- Store date discovered.
- Store discovery query.
- Store confidence score.
- Do not scrape platforms in ways that violate terms.

---

## Stage 6: AI Lead Scoring

Build AI scoring.

Create:

- aiLeadScoringService.ts
- aiPersonalisationService.ts
- aiComplianceRiskService.ts
- openAiProvider.ts
- localAiPlaceholder.ts

If OPENAI_API_KEY exists:

- Use OpenAI for scoring and personalisation.

If OPENAI_API_KEY does not exist:

- Use local placeholder scoring.

Generate:

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

---

## Stage 7: Email Verification

Build email verification.

Create:

- localEmailSyntaxCheck.ts
- neverbounceProviderPlaceholder.ts
- zerobounceProviderPlaceholder.ts
- debounceProviderPlaceholder.ts

Verification statuses:

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

---

## Stage 8: Compliance System

Build compliance system.

Create:

- complianceService.ts
- ukComplianceRules.ts
- usComplianceRules.ts
- suppressionService.ts
- unsubscribeService.ts
- domainReputationGuard.ts

Compliance statuses:

- Pending Review
- Passed
- Needs Manual Approval
- Failed
- Suppressed
- Unsubscribed
- Do Not Contact

Contact type statuses:

- Generic Business Email
- Named Corporate Email
- Individual Subscriber
- Sole Trader
- Partnership
- Unknown

Suppression reasons:

- Unsubscribed
- Do Not Contact
- Bounced
- Not Interested
- Manual Suppression
- Compliance Failed
- Duplicate
- Invalid Email

---

## Stage 9: Campaign Builder

Build campaign builder.

Campaign modes:

- Draft
- Review Required
- Active Manual
- Active Auto-Pilot
- Paused
- Completed

Default mode:

- Review Required

Create a default campaign:

Name:

UK and US Real Estate Agents

Target:

Real estate agents, estate agents, brokers, letting agents, and property agencies in the UK and US.

Minimum lead score:

75

Maximum leads discovered per day:

50

Maximum emails sent per day:

20 per inbox

Sending window:

09:00 to 15:30 local time of target country, Monday to Friday

---

## Stage 10: Email Builder

Build email template builder.

Support merge tags:

- {{first_name}}
- {{last_name}}
- {{full_name}}
- {{company_name}}
- {{website}}
- {{location}}
- {{city}}
- {{state}}
- {{country}}
- {{industry}}
- {{niche}}
- {{personalisation_note}}
- {{calendar_link}}
- {{sender_name}}
- {{agency_name}}
- {{unsubscribe_link}}
- {{business_address}}

Add email preview with selected lead.

Add default 5-step email sequence from EMAIL_SEQUENCE.md.

---

## Stage 11: Sending Queue

Build sending queue.

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

Default:

- SIMULATE_EMAIL_SENDING=true

Rules:

- Do not send outside sending window.
- Do not send on weekends by default.
- Do not send more than daily limit.
- Do not send to suppressed contacts.
- Do not send to unsubscribed contacts.
- Do not send to do-not-contact contacts.
- Do not send to bounced contacts.
- Do not send to invalid emails.
- Do not send to compliance-failed contacts.
- Do not send to leads below minimum score unless approved.
- Stop all follow-ups after reply, booking, unsubscribe, or bounce.

---

## Stage 12: Email Sending

Create provider-based sending.

Providers:

- SMTP
- SendGrid placeholder
- Mailgun placeholder
- Resend placeholder
- Instantly API placeholder
- Smartlead API placeholder

For version 1:

- Implement SMTP only if credentials are present.
- Otherwise use simulated sending.
- Show LIVE or SIMULATED badge.
- Require confirmation before enabling live sending.

---

## Stage 13: Reply Tracking

Build reply tracking.

For version 1:

- Manual reply marking.
- Placeholder for Gmail/IMAP.
- Placeholder for provider webhooks.

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

Rules:

- Positive reply → mark Interested and prepare for GHL.
- Booked reply → mark Booked Appointment and sync/prepare for GHL.
- Not interested → suppress.
- Unsubscribe request → unsubscribe, suppress, do-not-contact.
- Angry reply → suppress and do-not-contact.
- Out of office → pause and reschedule.

---

## Stage 14: GoHighLevel Sync

Build GHL sync placeholders.

Create:

- ghlService.ts
- ghlContactMapper.ts
- ghlOpportunityMapper.ts
- ghlSyncQueue.ts

If GHL credentials exist:

- Sync contacts/opportunities.

If missing:

- Show JSON preview.
- Allow CSV export.

Sync triggers:

- Interested
- Booked Appointment
- Manual Sync to GHL

---

## Stage 15: Domain Guard

Build domain reputation guard.

Checklist:

- SPF configured
- DKIM configured
- DMARC configured
- Dedicated sending domain
- Business address added
- Unsubscribe link enabled
- Email verification enabled
- Sending limits configured
- Suppression list active

Rules:

- Warn if SPF/DKIM/DMARC not marked configured.
- Warn if live sending enabled without checklist complete.
- Pause campaign if bounce rate exceeds threshold.
- Pause campaign if unsubscribe rate exceeds threshold.
- Warn against high daily volume.

---

## Stage 16: README

Create README with:

- What LeadSource does
- Setup instructions
- Environment variables
- How to run locally
- How to run migrations
- How to seed data
- How to use simulated sending
- How to enable SMTP sending
- How to add OpenAI
- How to add lead provider APIs
- How to add email verification APIs
- How to connect GoHighLevel
- UK/US compliance notes
- Domain reputation checklist
- Recommended safe sending limits
- Legal disclaimer
