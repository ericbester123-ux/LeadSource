import { DiscoveryCriteria, DiscoveryProvider } from "../types";
import { getMockDiscoveryLeads } from "./mockDiscoveryData";

export const clayProviderPlaceholder: DiscoveryProvider = {
  name: "Clay Placeholder",
  async discover(criteria: DiscoveryCriteria) {
    return process.env.CLAY_API_KEY ? getMockDiscoveryLeads(criteria, "Clay placeholder") : [];
  }
};
