"use client";

import { useActionState, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, FileUp, UploadCloud } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { Select } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableWrap } from "@/components/ui/table";
import { leadFieldOptions } from "@/lib/constants";
import { isValidEmail } from "@/lib/lead-utils";
import { CsvImportState, importCsvLeads } from "./actions";

type CsvRow = Record<string, string>;

const initialState: CsvImportState = {
  totalRows: 0,
  importedRows: 0,
  skippedDuplicates: 0,
  skippedSuppressed: 0,
  invalidEmails: 0,
  missingRequiredFields: 0,
  message: ""
};

function parseCsvLine(line: string) {
  const cells: string[] = [];
  let current = "";
  let quoted = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const next = line[index + 1];
    if (char === '"' && quoted && next === '"') {
      current += '"';
      index += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === "," && !quoted) {
      cells.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  cells.push(current.trim());
  return cells;
}

function parseCsv(text: string) {
  const lines = text.replace(/^\uFEFF/, "").split(/\r?\n/).filter((line) => line.trim());
  const headers = parseCsvLine(lines[0] ?? "");
  const rows = lines.slice(1).map((line) => {
    const values = parseCsvLine(line);
    return headers.reduce<CsvRow>((row, header, index) => {
      row[header] = values[index] ?? "";
      return row;
    }, {});
  });
  return { headers, rows };
}

function guessField(header: string) {
  const normal = header.toLowerCase().replace(/[^a-z]/g, "");
  const guesses: Record<string, string> = {
    firstname: "firstName",
    fname: "firstName",
    lastname: "lastName",
    lname: "lastName",
    fullname: "fullName",
    name: "fullName",
    email: "email",
    emailaddress: "email",
    phone: "phone",
    phonenumber: "phone",
    company: "companyName",
    companyname: "companyName",
    website: "website",
    location: "location",
    city: "city",
    state: "stateRegion",
    region: "stateRegion",
    country: "country",
    industry: "industry",
    niche: "niche",
    sourceurl: "sourceUrl",
    source: "sourcePlatform",
    leadsource: "sourcePlatform",
    notes: "notes",
    tags: "tags"
  };
  return guesses[normal] ?? "skip";
}

function buildMappedRows(rows: CsvRow[], mapping: Record<string, string>) {
  return rows.map((row) => {
    const mapped: Record<string, string> = {};
    Object.entries(mapping).forEach(([header, field]) => {
      if (field !== "skip") mapped[field] = row[header] ?? "";
    });
    return mapped;
  });
}

export function CsvImportClient({
  existingEmails,
  suppressedEmails
}: {
  existingEmails: string[];
  suppressedEmails: string[];
}) {
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<CsvRow[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [state, formAction, isPending] = useActionState(importCsvLeads, initialState);

  const existingSet = useMemo(() => new Set(existingEmails), [existingEmails]);
  const suppressedSet = useMemo(() => new Set(suppressedEmails), [suppressedEmails]);
  const mappedRows = useMemo(() => buildMappedRows(rows, mapping), [mapping, rows]);

  const preview = useMemo(() => {
    const seen = new Set<string>();
    return mappedRows.map((row) => {
      const email = row.email?.trim().toLowerCase() ?? "";
      const missingRequired = !email || !row.country?.trim() || (!row.companyName?.trim() && !row.fullName?.trim());
      const invalidEmail = Boolean(email) && !isValidEmail(email);
      const duplicate = Boolean(email) && (existingSet.has(email) || seen.has(email));
      const suppressed = Boolean(email) && suppressedSet.has(email);
      if (email) seen.add(email);
      const importable = !missingRequired && !invalidEmail && !duplicate && !suppressed;
      return { row, missingRequired, invalidEmail, duplicate, suppressed, importable };
    });
  }, [existingSet, mappedRows, suppressedSet]);

  const summary = {
    totalRows: rows.length,
    importedRows: preview.filter((row) => row.importable).length,
    skippedDuplicates: preview.filter((row) => row.duplicate).length,
    skippedSuppressed: preview.filter((row) => row.suppressed).length,
    invalidEmails: preview.filter((row) => row.invalidEmail).length,
    missingRequiredFields: preview.filter((row) => row.missingRequired).length
  };

  async function handleFile(file?: File) {
    if (!file) return;
    const parsed = parseCsv(await file.text());
    setHeaders(parsed.headers);
    setRows(parsed.rows);
    setMapping(Object.fromEntries(parsed.headers.map((header) => [header, guessField(header)])));
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">Import CSV</h2>
        <p className="mt-1 text-sm text-neutral-600">Upload, map, preview, validate, and import only safe lead rows.</p>
      </div>

      <Card>
        <label className="grid cursor-pointer place-items-center rounded-lg border border-dashed border-black/20 bg-neutral-50 p-10 text-center transition hover:border-gold-400 hover:bg-gold-50">
          <FileUp className="h-8 w-8 text-gold-600" />
          <span className="mt-3 font-semibold">Upload CSV file</span>
          <span className="mt-1 text-sm text-neutral-600">Preview and field mapping appear before anything imports.</span>
          <input type="file" accept=".csv,text/csv" className="hidden" onChange={(event) => handleFile(event.target.files?.[0])} />
        </label>
      </Card>

      {headers.length > 0 && (
        <>
          <Card>
            <CardHeader>
              <div>
                <h3 className="text-lg font-semibold">Map columns</h3>
                <p className="text-sm text-neutral-600">Required: email, country, and either company name or full name.</p>
              </div>
              <Badge tone="gold">{rows.length} rows</Badge>
            </CardHeader>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {headers.map((header) => (
                <label key={header} className="grid gap-1 text-sm font-medium">
                  {header}
                  <Select value={mapping[header] ?? "skip"} onChange={(event) => setMapping((current) => ({ ...current, [header]: event.target.value }))}>
                    {leadFieldOptions.map((field) => <option key={field.key} value={field.key}>{field.label}</option>)}
                  </Select>
                </label>
              ))}
            </div>
          </Card>

          <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">
            {[
              ["Total rows", summary.totalRows],
              ["Importable rows", summary.importedRows],
              ["Skipped duplicates", summary.skippedDuplicates],
              ["Skipped suppressed", summary.skippedSuppressed],
              ["Invalid emails", summary.invalidEmails],
              ["Missing required", summary.missingRequiredFields]
            ].map(([label, value]) => (
              <Card key={String(label)} className="p-4">
                <div className="text-xs text-neutral-500">{label}</div>
                <div className="mt-1 text-2xl font-semibold">{value}</div>
              </Card>
            ))}
          </div>

          <form action={formAction}>
            <input type="hidden" name="rows" value={JSON.stringify(mappedRows)} />
            <div className="mb-4 flex justify-end">
              <Button type="submit" disabled={isPending || summary.importedRows === 0}>
                <UploadCloud className="h-4 w-4" />
                Import valid rows
              </Button>
            </div>
          </form>

          {state.message && (
            <Card className="border-emerald-200 bg-emerald-50">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="mt-1 h-5 w-5 text-emerald-700" />
                <div>
                  <h3 className="font-semibold text-emerald-900">{state.message}</h3>
                  <p className="mt-1 text-sm text-emerald-800">
                    Imported {state.importedRows}; duplicates {state.skippedDuplicates}; suppressed {state.skippedSuppressed}; invalid {state.invalidEmails}; missing required {state.missingRequiredFields}.
                  </p>
                </div>
              </div>
            </Card>
          )}

          <TableWrap>
            <div className="max-h-[58vh] overflow-auto">
              <Table className="min-w-[1200px]">
                <thead className="sticky top-0 bg-neutral-50 text-xs uppercase text-neutral-500">
                  <tr>
                    <th className="px-3 py-3">Import status</th>
                    <th className="px-3 py-3">Email</th>
                    <th className="px-3 py-3">Company</th>
                    <th className="px-3 py-3">Full name</th>
                    <th className="px-3 py-3">Country</th>
                    <th className="px-3 py-3">City</th>
                    <th className="px-3 py-3">Source URL</th>
                    <th className="px-3 py-3">Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/10">
                  {preview.map((item, index) => (
                    <tr key={`${item.row.email}-${index}`}>
                      <td className="px-3 py-3">
                        {item.importable ? (
                          <Badge tone="green">Ready</Badge>
                        ) : (
                          <div className="flex items-center gap-2 text-xs text-red-700">
                            <AlertTriangle className="h-4 w-4" />
                            {item.missingRequired && "Missing required"}
                            {item.invalidEmail && "Invalid email"}
                            {item.duplicate && "Duplicate"}
                            {item.suppressed && "Suppressed"}
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-3">{item.row.email}</td>
                      <td className="px-3 py-3">{item.row.companyName}</td>
                      <td className="px-3 py-3">{item.row.fullName}</td>
                      <td className="px-3 py-3">{item.row.country}</td>
                      <td className="px-3 py-3">{item.row.city}</td>
                      <td className="px-3 py-3">{item.row.sourceUrl}</td>
                      <td className="px-3 py-3">{item.row.notes}</td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          </TableWrap>
        </>
      )}
    </div>
  );
}
