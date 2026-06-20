import type { DiscoveryPreview } from "@/lib/lead-discovery/discoveryService";

export type DiscoveryState = {
  runId?: string;
  provider?: string;
  results: DiscoveryPreview[];
  summary: {
    totalFound: number;
    added: number;
    approved: number;
    duplicatesSkipped: number;
    suppressedSkipped: number;
    missingEmail: number;
    errors: number;
    rejected: number;
  };
  message?: string;
};

export const initialDiscoverySummary: DiscoveryState["summary"] = {
  totalFound: 0,
  added: 0,
  approved: 0,
  duplicatesSkipped: 0,
  suppressedSkipped: 0,
  missingEmail: 0,
  errors: 0,
  rejected: 0
};

export const emptyDiscoveryState: DiscoveryState = {
  results: [],
  summary: initialDiscoverySummary
};
