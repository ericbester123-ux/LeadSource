# GoHighLevel Sync Requirements

## Purpose

LeadSource must sync qualified, interested, and booked leads to GoHighLevel contacts and opportunities under the correct status.

GoHighLevel is used by Estates Elevate as the CRM and pipeline system.

## Sync Goal

When a lead becomes interested or books a call, LeadSource should prepare or sync the lead into GoHighLevel.

Main flow:

Lead replies positively  
→ LeadSource marks lead as Interested  
→ LeadSource stops all follow-ups  
→ LeadSource prepares/syncs lead to GHL  
→ Lead appears in GHL pipeline under Interested

Lead books appointment  
→ LeadSource marks lead as Booked Appointment  
→ LeadSource stops all follow-ups  
→ LeadSource syncs lead to GHL  
→ Lead appears in GHL pipeline under Booked Appointment

## Environment Variables

Use these environment variables:

```env
GHL_API_KEY=
GHL_LOCATION_ID=
GHL_PIPELINE_ID=
GHL_STAGE_NEW_LEAD=
GHL_STAGE_INTERESTED=
GHL_STAGE_BOOKED=
GHL_STAGE_NOT_INTERESTED=
