export type CsvImportState = {
  totalRows: number;
  importedRows: number;
  skippedDuplicates: number;
  skippedSuppressed: number;
  invalidEmails: number;
  missingRequiredFields: number;
  message: string;
};

export const initialCsvImportState: CsvImportState = {
  totalRows: 0,
  importedRows: 0,
  skippedDuplicates: 0,
  skippedSuppressed: 0,
  invalidEmails: 0,
  missingRequiredFields: 0,
  message: ""
};
