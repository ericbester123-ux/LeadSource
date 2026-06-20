import { DiscoveryCriteria, DiscoveryProvider } from "../types";
import { getMockDiscoveryLeads } from "./mockDiscoveryData";

export const websiteSearchProvider: DiscoveryProvider = {
  name: "Website Search",
  async discover(criteria: DiscoveryCriteria) {
    if (!process.env.SERP_API_KEY) {
      return getMockDiscoveryLeads(criteria, "Mock Website Search");
    }

    return getMockDiscoveryLeads(criteria, "Website Search placeholder");
  }
};
