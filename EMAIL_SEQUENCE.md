# LeadSource Email Sequence

## Campaign Name

UK and US Real Estate Agents

## Target

- UK estate agents
- UK letting agents
- US real estate agents
- US real estate brokers
- Property agencies
- Boutique real estate firms
- Luxury real estate agencies

## Offer

Estates Elevate helps real estate agents turn online property leads into booked buyer and seller appointments using paid ads, AI follow-up, CRM automation, and appointment booking.

## Email Sequence Timing

- Day 1: Cold email
- Day 3: Follow-up 1
- Day 6: Follow-up 2
- Day 10: Follow-up 3
- Day 14: Final follow-up

## Merge Tags

The app must support these merge tags:

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

---

# Email 1: Cold Email

## Subject

Quick question about {{company_name}}

## Body

Hi {{first_name}},

I came across {{company_name}} and wanted to reach out.

We help real estate agents turn online leads into booked buyer and seller appointments using paid ads, AI follow-up, and automated booking systems.

Most agents do get leads, but the issue is usually that those leads are not followed up with fast enough or consistently enough.

Would you be open to a quick 15-minute call to see if this could help {{company_name}}?

Kind regards,  
{{sender_name}}  
{{agency_name}}  
{{website}}

{{business_address}}

To opt out of future emails, click here:  
{{unsubscribe_link}}

---

# Email 2: Follow-Up 1

## Subject

Re: Quick question about {{company_name}}

## Body

Hi {{first_name}},

Just following up.

Do you currently have a system in place that follows up with every new property lead automatically and helps book them into your calendar?

That is what we help real estate agents set up at {{agency_name}}.

Worth a quick chat?

Kind regards,  
{{sender_name}}

To opt out:  
{{unsubscribe_link}}

---

# Email 3: Follow-Up 2

## Subject

Re: Quick question about {{company_name}}

## Body

Hi {{first_name}},

A lot of real estate agents lose leads not because the lead was bad, but because the follow-up was too slow.

Our system helps with:

- Lead capture
- AI follow-up
- Appointment booking
- CRM tracking

Would you like me to show you how it could work for {{company_name}}?

Kind regards,  
{{sender_name}}

To opt out:  
{{unsubscribe_link}}

---

# Email 4: Follow-Up 3

## Subject

Re: Quick question about {{company_name}}

## Body

Hi {{first_name}},

Should I close your file for now?

I reached out because {{agency_name}} helps real estate agents generate leads and turn more of those leads into booked appointments.

If this is something you want to explore, here is my calendar:

{{calendar_link}}

Kind regards,  
{{sender_name}}

To opt out:  
{{unsubscribe_link}}

---

# Email 5: Final Follow-Up

## Subject

Re: Quick question about {{company_name}}

## Body

Hi {{first_name}},

This will be my last follow-up.

I reached out because {{agency_name}} helps real estate agents improve lead follow-up and booked appointments using AI automation and CRM systems.

If this becomes a priority later, you can book a quick call here:

{{calendar_link}}

Kind regards,  
{{sender_name}}

To opt out:  
{{unsubscribe_link}}

---

# AI Personalisation Examples

The AI personalisation assistant should generate first lines like:

- I noticed {{company_name}} works with property sellers in {{city}}, so I thought this would be relevant.
- I saw that {{company_name}} is active in the {{city}} property market and wanted to reach out.
- I noticed your agency focuses on real estate in {{location}}, and I had an idea that may help with lead follow-up.
- I saw that {{company_name}} handles property listings in {{city}}, and thought this may be useful for your team.
- I noticed {{company_name}} appears to work with buyers and sellers in {{location}}, so I wanted to reach out with a quick idea.

## Email Safety Rules

Every email must include:

- Sender name
- Agency name
- Website
- Opt-out/unsubscribe link
- Business/physical address if configured

Do not send if:

- Unsubscribe link is missing
- Sender identity is missing
- Agency name is missing
- Email verification failed
- Lead is suppressed
- Lead is do-not-contact
- Lead has bounced
- Lead is compliance failed
