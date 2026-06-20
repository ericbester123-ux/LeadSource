import { prisma } from "@/lib/prisma";
import { CsvImportClient } from "./csv-import-client";

export const dynamic = "force-dynamic";

export default async function ImportCsvPage() {
  const [existingEmails, suppressedEmails] = await Promise.all([
    prisma.lead.findMany({ select: { email: true } }),
    prisma.suppressionListEntry.findMany({ select: { email: true } })
  ]);

  return (
    <CsvImportClient
      existingEmails={existingEmails.map((lead) => lead.email?.toLowerCase()).filter((email): email is string => Boolean(email))}
      suppressedEmails={suppressedEmails.map((entry) => entry.email.toLowerCase())}
    />
  );
}
