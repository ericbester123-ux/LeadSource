import { GhlLead, mapPipelineStageId, mapPipelineStageName } from "./ghlContactMapper";

export function buildGhlOpportunityPayload(lead: GhlLead) {
  const campaign = lead.campaignEnrollments[0]?.campaign;
  return {
    pipelineId: process.env.GHL_PIPELINE_ID,
    locationId: process.env.GHL_LOCATION_ID,
    name: `${lead.companyName} - ${mapPipelineStageName(lead.status)}`,
    status: lead.status,
    pipelineStage: mapPipelineStageName(lead.status),
    pipelineStageId: mapPipelineStageId(lead.status),
    monetaryValue: 0,
    source: "LeadSource Cold Email",
    campaignName: campaign?.name,
    leadScore: lead.leadScore?.score ?? null,
    leadQuality: lead.leadScore?.qualityLabel ?? null,
    contact: {
      email: lead.email,
      phone: lead.phone,
      companyName: lead.companyName
    }
  };
}
