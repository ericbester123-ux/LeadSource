import { DiscoveryProvider } from "./types";
import { getMockDiscoveryLeads } from "./providers/mockDiscoveryData";

export const mockLeadDiscoveryProvider: DiscoveryProvider = {
  name: "Mock Discovery",
  discover(criteria) {
    return Promise.resolve(getMockDiscoveryLeads(criteria, "Mock Discovery"));
  }
};
