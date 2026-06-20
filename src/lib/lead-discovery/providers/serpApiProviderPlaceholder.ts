import { DiscoveryCriteria, DiscoveryProvider } from "../types";
import { getMockDiscoveryLeads } from "./mockDiscoveryData";

export const serpApiProviderPlaceholder: DiscoveryProvider = {
  name: "SerpApi Placeholder",
  async discover(criteria: DiscoveryCriteria) {
    return process.env.SERP_API_KEY ? getMockDiscoveryLeads(criteria, "SerpApi placeholder") : [];
  }
};
