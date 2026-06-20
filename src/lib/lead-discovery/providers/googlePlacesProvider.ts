import { DiscoveryCriteria, DiscoveryProvider } from "../types";
import { getMockDiscoveryLeads } from "./mockDiscoveryData";

export const googlePlacesProvider: DiscoveryProvider = {
  name: "Google Places",
  async discover(criteria: DiscoveryCriteria) {
    if (!process.env.GOOGLE_PLACES_API_KEY) {
      return getMockDiscoveryLeads(criteria, "Mock Google Places");
    }

    return getMockDiscoveryLeads(criteria, "Google Places placeholder");
  }
};
