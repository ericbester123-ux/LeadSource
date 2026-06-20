# LeadSource Compliance Rules

## Important Disclaimer

LeadSource is not a legal advice tool.

The app must include the following disclaimer in the Compliance page and README:

“This tool provides operational compliance checks, not legal advice. Review your outreach process with a qualified legal professional before running live campaigns.”

## Main Compliance Goal

LeadSource must reduce legal and domain reputation risk by:

- Avoiding spam behaviour
- Preventing outreach to do-not-contact leads
- Preventing outreach to unsubscribed leads
- Preventing outreach to bounced emails
- Verifying emails before sending
- Keeping source records
- Including opt-out/unsubscribe links
- Keeping suppression lists
- Keeping audit logs
- Applying UK and US compliance guardrails

## Global Rules

Every lead must have:

- Email address
- Country
- Source URL or source note
- Date collected
- Compliance status
- Email verification status
- Contact type
- Suppression status

Every email must include:

- Sender name
- Agency name
- Website URL
- Opt-out/unsubscribe link
- Business/physical address if configured
- Accurate subject line
- Accurate sender identity

Never send to:

- Unsubscribed leads
- Do-not-contact leads
- Suppressed leads
- Bounced leads
- Invalid emails
- Compliance-failed leads
- Leads below minimum score unless manually approved
- Duplicate email addresses

Stop all follow-ups when:

- Lead replies
- Lead books an appointment
- Lead unsubscribes
- Lead bounces
- Lead is marked not interested
- Lead is marked do-not-contact

## Compliance Statuses

Use these compliance statuses:

- Pending Review
- Passed
- Needs Manual Approval
- Failed
- Suppressed
- Unsubscribed
- Do Not Contact

## Contact Type Statuses

Use these contact type statuses:

- Generic Business Email
- Named Corporate Email
- Individual Subscriber
- Sole Trader
- Partnership
- Unknown

## Suppression Reasons

Use these suppression reasons:

- Unsubscribed
- Do Not Contact
- Bounced
- Not Interested
- Manual Suppression
- Compliance Failed
- Duplicate
- Invalid Email

---

# UK Compliance Guardrails

## Country Profile

Create a United Kingdom compliance profile.

## UK Outreach Risk Logic

Treat UK contacts differently based on contact type.

### Lower Risk

Generic business emails, for example:

- info@agency.co.uk
- sales@agency.co.uk
- hello@agency.co.uk
- enquiries@agency.co.uk

These can be marked as lower risk if:

- The business is clearly a company/corporate subscriber
- The source URL is stored
- The email is public business contact information
- The email is verified
- The email includes opt-out/unsubscribe
- The company is relevant to Estates Elevate’s B2B offer

### Medium Risk

Named corporate emails, for example:

- john@agency.co.uk
- jane.smith@agency.co.uk

These must be marked as medium risk because they involve personal data.

For named emails:

- Require source URL
- Require lawful basis notes
- Require legitimate interest notes
- Require manual approval before first send
- Include unsubscribe link
- Add to suppression list if they opt out or object

### Higher Risk

Treat these as high risk:

- Sole traders
- Partnerships
- Individual subscribers
- Unknown contact type
- Personal emails such as Gmail, Outlook, Yahoo, iCloud

For high-risk contacts:

- Default to Needs Manual Approval or Failed
- Do not auto-send
- Require explicit manual review
- Prefer not to send unless there is clear lawful basis/consent

## UK Required Fields

For UK leads, store:

- Source URL
- Date collected
- Contact type
- Lawful basis notes
- Legitimate interest notes
- Compliance status
- Opt-out status
- Suppression status

## UK Default Rules

Default UK settings:

- Allow sending only to business/corporate contacts that pass compliance checks.
- Require manual approval for named individual corporate emails.
- Block sole trader, partnership, unknown, and personal email contacts unless manually approved.
- Never auto-send to high-risk contacts.
- Always include unsubscribe link.
- Always keep suppression list.

---

# US Compliance Guardrails

## Country Profile

Create a United States compliance profile.

## US Required Email Rules

For US outreach, every email must have:

- Accurate sender name
- Accurate sender email
- Accurate subject line
- No deceptive headers
- No misleading subject lines
- Clear opt-out method
- Business/physical mailing address
- Agency name
- Website URL

## US Opt-Out Rules

If a contact opts out:

- Mark unsubscribed immediately
- Mark do-not-contact
- Add to suppression list
- Stop all follow-ups
- Do not send again

## US Default Rules

Default US settings:

- Allow B2B outreach only if email passes verification and compliance checks.
- Require unsubscribe link in every email.
- Require business/physical address before live sending.
- Suppress opt-outs immediately.
- Prevent any future sends to suppressed contacts.

---

# Unsubscribe System

Create endpoint:

/unsubscribe?email={{email}}&token={{token}}

When clicked:

- Verify token
- Mark lead as unsubscribed
- Mark lead as do-not-contact
- Add lead to suppression list
- Stop all campaigns for that lead
- Show confirmation page

Confirmation text:

“You have been unsubscribed and will no longer receive outreach emails from Estates Elevate.”

## Suppression List

Suppression list features:

- Search suppressed contacts
- Export suppression list
- Add contact manually
- Remove only with admin confirmation and audit log
- Prevent re-importing suppressed contacts
- Prevent rediscovering suppressed contacts
- Prevent sending to suppressed contacts

---

# Domain Reputation Guard

The app must protect domain reputation.

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

- Warn if SPF/DKIM/DMARC are not marked configured.
- Warn if live sending is enabled without domain checklist complete.
- Pause campaign automatically if bounce rate exceeds threshold.
- Pause campaign automatically if unsubscribe rate exceeds threshold.
- Warn against high daily sending volumes.

Default safe sending:

- 20 emails per inbox per day
- Monday to Friday only
- 09:00–15:30 recipient local time
- Random delay between sends
- Warning if increasing above 50 per inbox per day

---

# Audit Logs

Every important action must create an audit log.

Audit log events:

- Lead discovered
- Lead imported
- Lead scored
- Email verified
- Compliance checked
- Lead approved
- Lead rejected
- Lead suppressed
- Email queued
- Email sent
- Email skipped
- Email failed
- Lead replied
- Lead booked
- Lead unsubscribed
- Lead bounced
- Lead synced to GHL
- Live sending enabled
- Sending limit changed
- Compliance override applied

Audit log fields:

- userId
- action
- entityType
- entityId
- reason
- metadata
- createdAt
