import { DiscoveryCriteria, DiscoveryProvider } from "../types";

export const linkedinManualProviderPlaceholder: DiscoveryProvider = {
  name: "LinkedIn Manual Placeholder",
  async discover(_criteria: DiscoveryCriteria) {
    return [];
  }
};
