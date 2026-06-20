"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { buildFullName, isValidEmail, qualityFromScore } from "@/lib/lead-utils";

function value(formData: FormData, key: string) {
  const raw = formData.get(key);
  return typeof raw === "string" && raw.trim() ? raw.trim() : undefined;
}

function boolValue(formData: FormData, key: string) {
  return formData.get(key) === "on";
}

function intValue(formData: FormData, key: string) {
  const raw = value(formData, key);
  if (!raw) return undefined;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function dateValue(formData: FormData, key: string) {
  const raw = value(formData, key);
  return raw ? new Date(raw) : undefined;
}

async function ensureManualSource() {
  return prisma.leadSource.upsert({
    where: { id: "manual-entry" },
    update: {},
    create: {
      id: "manual-entry",
      name: "Manual Entry",
      type: "Manual",
      provider: "LeadSource",
      description: "Leads created manually in the Leads page."
    }
  });
}

async function writeAudit(action: string, entityType: string, entityId?: string, reason?: string, metadata?: unknown) {
  await prisma.auditLog.create({
    data: {
      action,
      entityType,
      entityId,
      reason,
      metadata: metadata ? JSON.stringify(metadata) : undefined
    }
  });
}

export async function createLead(formData: FormData) {
  const email = value(formData, "email")?.toLowerCase();
  const companyName = value(formData, "companyName");
  const country = value(formData, "country");

  if (!email || !isValidEmail(email) || !companyName || !country) {
    redirect("/leads?error=missing-required-lead-fields");
  }

  const source = await ensureManualSource();
  const score = intValue(formData, "score");
  const fullName = buildFullName(value(formData, "firstName"), value(formData, "lastName"), value(formData, "fullName"));

  const lead = await prisma.lead.create({
    data: {
      firstName: value(formData, "firstName"),
      lastName: value(formData, "lastName"),
      fullName,
      email,
      phone: value(formData, "phone"),
      companyName,
      website: value(formData, "website"),
      location: value(formData, "location"),
      city: value(formData, "city"),
      stateRegion: value(formData, "stateRegion"),
      country,
      industry: value(formData, "industry"),
      niche: value(formData, "niche"),
      sourceUrl: value(formData, "sourceUrl"),
      sourcePlatform: value(formData, "sourcePlatform") ?? source.name,
      personalisationNote: value(formData, "personalisationNote"),
      contactType: value(formData, "contactType") ?? "Unknown",
      status: value(formData, "status") ?? "New",
      tags: value(formData, "tags"),
      notes: value(formData, "notes"),
      doNotContact: boolValue(formData, "doNotContact"),
      unsubscribed: boolValue(formData, "unsubscribed"),
      bounced: boolValue(formData, "bounced"),
      ghlSyncStatus: value(formData, "ghlSyncStatus") ?? "Not Ready",
      lastContactedAt: dateValue(formData, "lastContactedAt"),
      nextFollowUpAt: dateValue(formData, "nextFollowUpAt"),
      leadSourceId: source.id,
      leadScore: score
        ? {
            create: {
              score,
              qualityLabel: value(formData, "qualityLabel") ?? qualityFromScore(score)
            }
          }
        : undefined,
      emailVerification: {
        create: { status: value(formData, "verificationStatus") ?? "Not Checked", provider: "manual" }
      },
      complianceCheck: {
        create: {
          status: value(formData, "complianceStatus") ?? "Pending Review",
          countryProfile: country,
          sourceUrlPresent: Boolean(value(formData, "sourceUrl"))
        }
      }
    }
  });

  const campaignId = value(formData, "campaignId");
  if (campaignId) {
    await prisma.campaignEnrollment.create({
      data: { leadId: lead.id, campaignId, status: "Ready for Review" }
    });
  }

  await writeAudit("Lead created", "Lead", lead.id, "Manual lead creation", { email });
  revalidatePath("/leads");
  redirect("/leads");
}

export async function updateLead(formData: FormData) {
  const id = value(formData, "id");
  const email = value(formData, "email")?.toLowerCase();
  const companyName = value(formData, "companyName");
  const country = value(formData, "country");

  if (!id || !email || !isValidEmail(email) || !companyName || !country) {
    redirect("/leads?error=missing-required-lead-fields");
  }

  const score = intValue(formData, "score");
  const fullName = buildFullName(value(formData, "firstName"), value(formData, "lastName"), value(formData, "fullName"));

  await prisma.lead.update({
    where: { id },
    data: {
      firstName: value(formData, "firstName"),
      lastName: value(formData, "lastName"),
      fullName,
      email,
      phone: value(formData, "phone"),
      companyName,
      website: value(formData, "website"),
      location: value(formData, "location"),
      city: value(formData, "city"),
      stateRegion: value(formData, "stateRegion"),
      country,
      industry: value(formData, "industry"),
      niche: value(formData, "niche"),
      sourceUrl: value(formData, "sourceUrl"),
      sourcePlatform: value(formData, "sourcePlatform"),
      personalisationNote: value(formData, "personalisationNote"),
      contactType: value(formData, "contactType") ?? "Unknown",
      status: value(formData, "status") ?? "Discovered",
      tags: value(formData, "tags"),
      notes: value(formData, "notes"),
      doNotContact: boolValue(formData, "doNotContact"),
      unsubscribed: boolValue(formData, "unsubscribed"),
      bounced: boolValue(formData, "bounced"),
      ghlSyncStatus: value(formData, "ghlSyncStatus") ?? "Not Ready",
      lastContactedAt: dateValue(formData, "lastContactedAt"),
      nextFollowUpAt: dateValue(formData, "nextFollowUpAt"),
      leadScore: score
        ? {
            upsert: {
              create: { score, qualityLabel: value(formData, "qualityLabel") ?? qualityFromScore(score) },
              update: { score, qualityLabel: value(formData, "qualityLabel") ?? qualityFromScore(score) }
            }
          }
        : undefined,
      emailVerification: {
        upsert: {
          create: { status: value(formData, "verificationStatus") ?? "Not Checked", provider: "manual" },
          update: { status: value(formData, "verificationStatus") ?? "Not Checked" }
        }
      },
      complianceCheck: {
        upsert: {
          create: {
            status: value(formData, "complianceStatus") ?? "Pending Review",
            countryProfile: country,
            sourceUrlPresent: Boolean(value(formData, "sourceUrl"))
          },
          update: {
            status: value(formData, "complianceStatus") ?? "Pending Review",
            countryProfile: country,
            sourceUrlPresent: Boolean(value(formData, "sourceUrl"))
          }
        }
      }
    }
  });

  const campaignId = value(formData, "campaignId");
  if (campaignId) {
    await prisma.campaignEnrollment.upsert({
      where: { campaignId_leadId: { campaignId, leadId: id } },
      update: {},
      create: { campaignId, leadId: id, status: "Ready for Review" }
    });
  }

  await writeAudit("Lead updated", "Lead", id, "Manual lead update", { email });
  revalidatePath("/leads");
  redirect("/leads");
}

export async function deleteLead(formData: FormData) {
  const id = value(formData, "id");
  if (!id) return;
  const lead = await prisma.lead.findUnique({ where: { id }, select: { email: true } });
  await prisma.lead.delete({ where: { id } });
  await writeAudit("Lead deleted", "Lead", id, "Manual lead deletion", { email: lead?.email });
  revalidatePath("/leads");
}

export async function bulkLeadAction(formData: FormData) {
  const ids = formData.getAll("leadIds").filter((id): id is string => typeof id === "string" && Boolean(id));
  const action = value(formData, "bulkAction");
  const campaignId = value(formData, "bulkCampaignId");
  if (!ids.length || !action) return;

  if (action === "approve") {
    await prisma.lead.updateMany({ where: { id: { in: ids } }, data: { status: "Approved", manuallyApproved: true } });
    await writeAudit("Bulk approve", "Lead", undefined, "Leads bulk approved", { ids });
  }

  if (action === "reject") {
    await prisma.lead.updateMany({ where: { id: { in: ids } }, data: { status: "Not Interested" } });
    await writeAudit("Bulk reject", "Lead", undefined, "Leads bulk rejected", { ids });
  }

  if (action === "verify") {
    for (const id of ids) {
      await prisma.emailVerification.upsert({
        where: { leadId: id },
        update: { status: "Valid", provider: "placeholder", verifiedAt: new Date() },
        create: { leadId: id, status: "Valid", provider: "placeholder", verifiedAt: new Date() }
      });
    }
    await writeAudit("Bulk verify placeholder", "EmailVerification", undefined, "Placeholder verification applied", { ids });
  }

  if (action === "score") {
    for (const id of ids) {
      await prisma.leadScore.upsert({
        where: { leadId: id },
        update: { score: 75, qualityLabel: "Good Fit" },
        create: { leadId: id, score: 75, qualityLabel: "Good Fit", reasonForScore: "Placeholder bulk score." }
      });
    }
    await prisma.lead.updateMany({ where: { id: { in: ids } }, data: { status: "Scored" } });
    await writeAudit("Bulk score placeholder", "LeadScore", undefined, "Placeholder score applied", { ids });
  }

  if (action === "assignCampaign" && campaignId) {
    for (const id of ids) {
      await prisma.campaignEnrollment.upsert({
        where: { campaignId_leadId: { campaignId, leadId: id } },
        update: {},
        create: { campaignId, leadId: id, status: "Ready for Review" }
      });
    }
    await writeAudit("Bulk assign campaign", "CampaignEnrollment", undefined, "Campaign assigned in bulk", { ids, campaignId });
  }

  if (action === "suppress") {
    const leads = await prisma.lead.findMany({ where: { id: { in: ids } }, select: { id: true, email: true } });
    await prisma.lead.updateMany({ where: { id: { in: ids } }, data: { status: "Do Not Contact", doNotContact: true } });
    for (const lead of leads) {
      await prisma.suppressionListEntry.upsert({
        where: { email: lead.email },
        update: { reason: "Manual Suppression" },
        create: { email: lead.email, reason: "Manual Suppression", source: "Bulk action" }
      });
    }
    await writeAudit("Bulk suppress", "SuppressionListEntry", undefined, "Leads suppressed in bulk", { ids });
  }

  if (action === "syncGhl") {
    await prisma.lead.updateMany({ where: { id: { in: ids } }, data: { ghlSyncStatus: "Ready for GHL" } });
    await writeAudit("Bulk sync to GHL placeholder", "GHLSyncLog", undefined, "GHL sync placeholder queued", { ids });
  }

  revalidatePath("/leads");
}
