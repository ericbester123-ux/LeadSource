export type DiscoveryCriteria = {
  country: string;
  city?: string;
  regionState?: string;
  industry?: string;
  niche?: string;
  keywords?: string;
  companyType?: string;
  maxLeads: number;
  minLeadScore?: number;
};

export type DiscoveredLead = {
  firstName?: string;
  lastName?: string;
  fullName?: string;
  email: string;
  phone?: string;
  companyName: string;
  website: string;
  location?: string;
  city?: string;
  stateRegion?: string;
  country: string;
  industry?: string;
  niche?: string;
  sourceUrl: string;
  sourcePlatform: string;
  discoveryQuery: string;
  confidenceScore: number;
  personalisationNote?: string;
  contactType: string;
};

export type DiscoveryProvider = {
  name: string;
  discover(criteria: DiscoveryCriteria): Promise<DiscoveredLead[]>;
};
