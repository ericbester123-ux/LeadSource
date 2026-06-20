import { Prisma } from "@prisma/client";

export const ghlLeadInclude = Prisma.validator<Prisma.LeadInclude>()({
  leadScore: true,
  campaignEnrollments: { include: { campaign: true } },
  replies: { orderBy: { repliedAt: "desc" }, take: 1 }
});

export type GhlLead = Prisma.LeadGetPayload<{ include: typeof ghlLeadInclude }>;

const defaultTags = ["LeadSource", "Cold Email", "Real Estate", "Estates Elevate"];

export function countryTag(country: string) {
  if (country === "United Kingdom") return "UK";
  if (country === "United States") return "US";
  return undefined;
}

export function statusTags(lead: GhlLead) {
  const latestReply = lead.replies[0];
  return [
    lead.status === "Interested" && "Interested",
    lead.status === "Booked Appointment" && "Booked Appointment",
    latestReply?.replyStatus === "Positive" && "Positive Reply",
    latestReply && !["Positive", "Booked"].includes(latestReply.replyStatus) && "Needs Manual Reply"
  ].filter(Boolean) as string[];
}

export function mapPipelineStageName(status: string) {
  if (status === "Interested") return "Interested";
  if (status === "Booked Appointment") return "Booked Appointment";
  if (status === "Not Interested") return "Not Interested";
  return "New Lead";
}

export function mapPipelineStageId(status: string) {
  if (status === "Interested") return process.env.GHL_STAGE_INTERESTED;
  if (status === "Booked Appointment") return process.env.GHL_STAGE_BOOKED;
  if (status === "Not Interested") return process.env.GHL_STAGE_NOT_INTERESTED;
  return process.env.GHL_STAGE_NEW_LEAD;
}

export function buildGhlContactPayload(lead: GhlLead) {
  const campaignName = lead.campaignEnrollments[0]?.campaign.name;
  const score = lead.leadScore?.score ?? null;
  const quality = lead.leadScore?.qualityLabel ?? null;
  const fallbackName = [lead.firstName, lead.lastName].filter(Boolean).join(" ");
  const tags = Array.from(new Set([
    ...defaultTags,
    countryTag(lead.country),
    ...statusTags(lead),
    ...(lead.tags ? lead.tags.split(",").map((tag) => tag.trim()).filter(Boolean) : [])
  ].filter(Boolean) as string[]));

  return {
    firstName: lead.firstName,
    lastName: lead.lastName,
    name: (lead.fullName ?? fallbackName) || lead.companyName,
    email: lead.email,
    phone: lead.phone,
    companyName: lead.companyName,
    website: lead.website,
    source: "LeadSource Cold Email",
    tags,
    notes: lead.notes,
    country: lead.country,
    city: lead.city,
    campaignName,
    leadScore: score,
    leadQuality: quality,
    status: lead.status,
    pipelineStage: mapPipelineStageName(lead.status),
    pipelineStageId: mapPipelineStageId(lead.status),
    customFields: {
      stateRegion: lead.stateRegion,
      industry: lead.industry,
      niche: lead.niche,
      leadSourceUrl: lead.sourceUrl,
      personalisationNote: lead.personalisationNote,
      ghlSyncStatus: lead.ghlSyncStatus
    }
  };
}
