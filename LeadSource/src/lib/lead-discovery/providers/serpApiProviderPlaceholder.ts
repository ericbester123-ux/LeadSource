import { DiscoveryCriteria, DiscoveryProvider } from "../types";
import { getMockDiscoveryLeads } from "./mockDiscoveryData";

export const serpApiProviderPlaceholder: DiscoveryProvider = {
  name: "SerpAPI",
  async discover(criteria: DiscoveryCriteria) {
    return process.env.SERP_API_KEY ? getMockDiscoveryLeads(criteria, "SerpAPI placeholder") : getMockDiscoveryLeads(criteria, "Mock SerpAPI");
  }
};
