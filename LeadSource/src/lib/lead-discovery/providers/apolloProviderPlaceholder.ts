import { DiscoveryCriteria, DiscoveryProvider } from "../types";
import { getMockDiscoveryLeads } from "./mockDiscoveryData";

export const apolloProviderPlaceholder: DiscoveryProvider = {
  name: "Apollo Placeholder",
  async discover(criteria: DiscoveryCriteria) {
    return process.env.APOLLO_API_KEY ? getMockDiscoveryLeads(criteria, "Apollo placeholder") : [];
  }
};
