"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { writeAudit } from "@/lib/audit";
import { isValidEmail } from "@/lib/lead-utils";

const highRiskUkContactTypes = new Set(["Sole Trader", "Partnership", "Individual Subscriber", "Unknown"]);

function ids(formData: FormData) {
  return formData.getAll("leadIds").filter((id): id is string => typeof id === "string" && Boolean(id));
}

function value(formData: FormData, key: string) {
  const raw = formData.get(key);
  return typeof raw === "string" && raw.trim() ? raw.trim() : undefined;
}

async function evaluateLead(leadId: string, manualReason?: string) {
  const lead = await prisma.lead.findUnique({
    where: { id: leadId },
    include: { emailVerification: true, complianceCheck: true }
  });
  if (!lead) return;

  const suppressed = await prisma.suppressionListEntry.findUnique({ where: { email: lead.email } });
  const notes: string[] = [];
  let status = "Passed";
  let riskLevel = "Low";
  let manualApprovalRequired = false;

  if (suppressed) {
    status = "Suppressed";
    riskLevel = "Blocked";
    notes.push(`Suppression list match: ${suppressed.reason}.`);
  } else if (lead.unsubscribed) {
    status = "Unsubscribed";
    riskLevel = "Blocked";
    notes.push("Lead has unsubscribed.");
  } else if (lead.doNotContact || lead.status === "Do Not Contact") {
    status = "Do Not Contact";
    riskLevel = "Blocked";
    notes.push("Lead is marked do-not-contact.");
  } else if (lead.bounced) {
    status = "Failed";
    riskLevel = "Blocked";
    notes.push("Lead has bounced.");
  } else if (!isValidEmail(lead.email) || lead.emailVerification?.status === "Invalid") {
    status = "Failed";
    riskLevel = "Blocked";
    notes.push("Email is invalid.");
  } else {
    const country = lead.country.toLowerCase();
    if (country.includes("united kingdom") || country === "uk" || country.includes("england")) {
      if (lead.contactType === "Named Corporate Email") {
        status = "Needs Manual Approval";
        riskLevel = "Medium";
        manualApprovalRequired = true;
        notes.push("UK named corporate email requires documented legitimate-interest review.");
      }
      if (highRiskUkContactTypes.has(lead.contactType)) {
        status = "Needs Manual Approval";
        riskLevel = "High";
        manualApprovalRequired = true;
        notes.push("UK sole traders, partnerships, individual subscribers, and unknown contacts are high risk.");
      }
    }

    if (country.includes("united states") || country === "us" || country === "usa") {
      const [settings, guard] = await Promise.all([
        prisma.settings.findFirst(),
        prisma.domainReputationCheck.findFirst()
      ]);
      if (settings?.unsubscribeLinkRequired !== false && !guard?.businessAddressAdded) {
        status = "Needs Manual Approval";
        riskLevel = "Medium";
        manualApprovalRequired = true;
        notes.push("US outreach requires an unsubscribe link and business address before live sending.");
      }
    }
  }

  if (manualReason) notes.push(manualReason);

  await prisma.complianceCheck.upsert({
    where: { leadId },
    update: {
      status,
      countryProfile: lead.country,
      riskLevel,
      sourceUrlPresent: Boolean(lead.sourceUrl),
      lawfulBasisPresent: Boolean(lead.lawfulBasisNotes || lead.legitimateInterestNotes),
      unsubscribeRequired: true,
      manualApprovalRequired,
      notes: notes.join(" "),
      checkedAt: new Date()
    },
    create: {
      leadId,
      status,
      countryProfile: lead.country,
      riskLevel,
      sourceUrlPresent: Boolean(lead.sourceUrl),
      lawfulBasisPresent: Boolean(lead.lawfulBasisNotes || lead.legitimateInterestNotes),
      unsubscribeRequired: true,
      manualApprovalRequired,
      notes: notes.join(" "),
      checkedAt: new Date()
    }
  });

  await writeAudit("Compliance check run", "Lead", lead.id, `Compliance status set to ${status}`, { email: lead.email, riskLevel, notes });
}

export async function runSelectedComplianceChecks(formData: FormData) {
  for (const id of ids(formData)) await evaluateLead(id);
  revalidatePath("/compliance");
}

export async function runPendingComplianceChecks() {
  const pending = await prisma.lead.findMany({
    where: { OR: [{ complianceCheck: null }, { complianceCheck: { status: "Pending Review" } }] },
    select: { id: true }
  });
  for (const lead of pending) await evaluateLead(lead.id);
  revalidatePath("/compliance");
}

export async function manuallyApproveCompliance(formData: FormData) {
  const leadId = value(formData, "leadId");
  const reason = value(formData, "reason");
  if (!leadId || !reason) return;

  const lead = await prisma.lead.findUnique({ where: { id: leadId }, include: { emailVerification: true } });
  if (!lead) return;
  const suppressed = await prisma.suppressionListEntry.findUnique({ where: { email: lead.email } });
  const blocked = suppressed || lead.unsubscribed || lead.bounced || lead.doNotContact || lead.status === "Do Not Contact" || !isValidEmail(lead.email) || lead.emailVerification?.status === "Invalid";
  if (blocked) {
    await evaluateLead(leadId, `Manual approval blocked: ${reason}`);
    revalidatePath("/compliance");
    return;
  }

  await prisma.complianceCheck.upsert({
    where: { leadId },
    update: { status: "Passed", riskLevel: "Manually Approved", manualApprovalRequired: false, lawfulBasisPresent: true, notes: reason, checkedAt: new Date() },
    create: { leadId, status: "Passed", riskLevel: "Manually Approved", manualApprovalRequired: false, lawfulBasisPresent: true, notes: reason, checkedAt: new Date() }
  });
  await prisma.lead.update({ where: { id: leadId }, data: { manuallyApproved: true, lawfulBasisNotes: reason, status: "Compliance Passed" } });
  await writeAudit("Compliance manually approved", "Lead", leadId, reason);
  revalidatePath("/compliance");
}

export async function manuallyFailCompliance(formData: FormData) {
  const leadId = value(formData, "leadId");
  const reason = value(formData, "reason");
  if (!leadId || !reason) return;
  await prisma.complianceCheck.upsert({
    where: { leadId },
    update: { status: "Failed", riskLevel: "Blocked", manualApprovalRequired: false, notes: reason, checkedAt: new Date() },
    create: { leadId, status: "Failed", riskLevel: "Blocked", manualApprovalRequired: false, notes: reason, checkedAt: new Date() }
  });
  await writeAudit("Compliance manually failed", "Lead", leadId, reason);
  revalidatePath("/compliance");
}
