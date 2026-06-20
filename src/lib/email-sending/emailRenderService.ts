import { Lead } from "@prisma/client";
import { defaultSafetySettings } from "@/lib/settings";

type RenderLead = Pick<Lead, "firstName" | "lastName" | "fullName" | "companyName" | "website" | "location" | "city" | "stateRegion" | "country" | "industry" | "niche" | "personalisationNote" | "email">;

export const renderDefaults = {
  calendar_link: defaultSafetySettings.calendarBookingLink,
  sender_name: process.env.SENDER_NAME || defaultSafetySettings.senderName,
  agency_name: defaultSafetySettings.agencyName,
  business_address: process.env.BUSINESS_ADDRESS || defaultSafetySettings.businessAddress,
  website: defaultSafetySettings.websiteUrl
};

export function createUnsubscribeToken(email: string) {
  return Buffer.from(`${email}:${process.env.NEXTAUTH_SECRET ?? "leadsource-simulation"}`).toString("base64url");
}

export function isValidUnsubscribeToken(email: string, token: string) {
  return createUnsubscribeToken(email) === token;
}

export function createUnsubscribeLink(email: string) {
  return `https://leadsource.local/unsubscribe?email=${encodeURIComponent(email)}&token=${createUnsubscribeToken(email)}`;
}

export function renderTemplate(template: string, lead: RenderLead) {
  const values: Record<string, string> = {
    first_name: lead.firstName ?? "",
    last_name: lead.lastName ?? "",
    full_name: lead.fullName ?? [lead.firstName, lead.lastName].filter(Boolean).join(" "),
    company_name: lead.companyName,
    website: lead.website || renderDefaults.website,
    location: lead.location ?? "",
    city: lead.city ?? "",
    state: lead.stateRegion ?? "",
    country: lead.country,
    industry: lead.industry ?? "",
    niche: lead.niche ?? "",
    personalisation_note: lead.personalisationNote ?? "",
    calendar_link: renderDefaults.calendar_link,
    sender_name: renderDefaults.sender_name,
    agency_name: renderDefaults.agency_name,
    unsubscribe_link: createUnsubscribeLink(lead.email),
    business_address: renderDefaults.business_address
  };

  return template.replace(/\{\{(.*?)\}\}/g, (_match, key: string) => values[key.trim()] ?? "");
}

export function renderQueueEmail(subjectTemplate: string, bodyTemplate: string, lead: RenderLead) {
  return {
    subject: renderTemplate(subjectTemplate, lead).trim(),
    body: renderTemplate(bodyTemplate, lead).trim()
  };
}

export function validateRenderedEmail(subject: string, body: string) {
  const lowerBody = body.toLowerCase();
  const errors = [
    !subject.trim() && "Subject line is missing.",
    !body.trim() && "Body is missing.",
    !lowerBody.includes("unsubscribe") && "Unsubscribe link is missing."
  ].filter(Boolean) as string[];

  return {
    ok: errors.length === 0,
    errors,
    hasUnsubscribe: lowerBody.includes("unsubscribe"),
    hasSender: body.includes(renderDefaults.sender_name),
    hasAgency: body.includes(renderDefaults.agency_name),
    hasWebsite: body.includes(renderDefaults.website),
    hasBusinessAddress: Boolean(renderDefaults.business_address.trim()) && body.includes(renderDefaults.business_address)
  };
}

export function hasRequiredIdentity(body: string) {
  const rendered = validateRenderedEmail("subject", body);
  return {
    hasUnsubscribe: rendered.hasUnsubscribe,
    hasSender: rendered.hasSender,
    hasAgency: rendered.hasAgency,
    hasWebsite: rendered.hasWebsite,
    hasBusinessAddress: rendered.hasBusinessAddress
  };
}
