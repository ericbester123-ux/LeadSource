import { DiscoveryCriteria, DiscoveryProvider } from "../types";
import { getMockDiscoveryLeads } from "./mockDiscoveryData";

export const peopleDataLabsProviderPlaceholder: DiscoveryProvider = {
  name: "People Data Labs Placeholder",
  async discover(criteria: DiscoveryCriteria) {
    return process.env.PEOPLEDATALABS_API_KEY ? getMockDiscoveryLeads(criteria, "People Data Labs placeholder") : [];
  }
};
