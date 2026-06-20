"use server";

import { prisma } from "@/lib/prisma";
import { buildFullName, isValidEmail } from "@/lib/lead-utils";
import type { CsvImportState } from "./state";

type CsvLeadInput = {
  firstName?: string;
  lastName?: string;
  fullName?: string;
  email?: string;
  phone?: string;
  companyName?: string;
  website?: string;
  location?: string;
  city?: string;
  stateRegion?: string;
  country?: string;
  industry?: string;
  niche?: string;
  sourceUrl?: string;
  sourcePlatform?: string;
  personalisationNote?: string;
  tags?: string;
  notes?: string;
};

async function ensureCsvSource() {
  return prisma.leadSource.upsert({
    where: { id: "csv-import" },
    update: {},
    create: {
      id: "csv-import",
      name: "CSV Import",
      type: "CSV",
      provider: "LeadSource",
      description: "Leads imported through Stage 4 CSV import."
    }
  });
}

async function audit(action: string, entityType: string, entityId?: string, reason?: string, metadata?: unknown) {
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

export async function importCsvLeads(_prevState: CsvImportState, formData: FormData): Promise<CsvImportState> {
  const raw = formData.get("rows");
  const rows: CsvLeadInput[] = typeof raw === "string" ? JSON.parse(raw) : [];
  const state: CsvImportState = {
    totalRows: rows.length,
    importedRows: 0,
    skippedDuplicates: 0,
    skippedSuppressed: 0,
    invalidEmails: 0,
    missingRequiredFields: 0,
    message: ""
  };

  const source = await ensureCsvSource();
  const existing = new Set((await prisma.lead.findMany({ select: { email: true } })).map((lead) => lead.email?.toLowerCase()).filter((email): email is string => Boolean(email)));
  const suppressed = new Set(
    (await prisma.suppressionListEntry.findMany({ select: { email: true } })).map((entry) => entry.email.toLowerCase())
  );
  const seen = new Set<string>();

  for (const row of rows) {
    const email = row.email?.trim().toLowerCase() ?? "";
    const companyName = row.companyName?.trim();
    const fullName = buildFullName(row.firstName, row.lastName, row.fullName);
    const country = row.country?.trim();

    if (!email || !country || (!companyName && !fullName)) {
      state.missingRequiredFields += 1;
      continue;
    }

    if (!isValidEmail(email)) {
      state.invalidEmails += 1;
      continue;
    }

    if (existing.has(email) || seen.has(email)) {
      state.skippedDuplicates += 1;
      await audit("Skipped duplicate", "Lead", undefined, "CSV import duplicate email", { email });
      continue;
    }

    if (suppressed.has(email)) {
      state.skippedSuppressed += 1;
      await audit("Skipped suppressed", "Lead", undefined, "CSV import suppressed email", { email });
      continue;
    }

    const lead = await prisma.lead.create({
      data: {
        firstName: row.firstName?.trim() || undefined,
        lastName: row.lastName?.trim() || undefined,
        fullName,
        email,
        phone: row.phone?.trim() || undefined,
        companyName: companyName || fullName || "Unknown company",
        website: row.website?.trim() || undefined,
        location: row.location?.trim() || undefined,
        city: row.city?.trim() || undefined,
        stateRegion: row.stateRegion?.trim() || undefined,
        country,
        industry: row.industry?.trim() || undefined,
        niche: row.niche?.trim() || undefined,
        sourceUrl: row.sourceUrl?.trim() || undefined,
        sourcePlatform: row.sourcePlatform?.trim() || "CSV Import",
        personalisationNote: row.personalisationNote?.trim() || undefined,
        tags: row.tags?.trim() || undefined,
        notes: row.notes?.trim() || undefined,
        status: "New",
        leadSourceId: source.id,
        emailVerification: { create: { status: "Not Checked", provider: "local" } },
        complianceCheck: {
          create: {
            status: "Pending Review",
            countryProfile: country,
            sourceUrlPresent: Boolean(row.sourceUrl?.trim())
          }
        }
      }
    });

    state.importedRows += 1;
    seen.add(email);
    existing.add(email);
    await audit("Lead imported", "Lead", lead.id, "CSV import row imported", { email });
  }

  await audit("CSV import", "Lead", undefined, "CSV import completed", state);
  state.message = `${state.importedRows} leads imported from ${state.totalRows} rows.`;
  return state;
}
