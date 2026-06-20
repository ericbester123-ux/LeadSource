import { DiscoveryCriteria, DiscoveryProvider } from "../types";

export const manualCsvProvider: DiscoveryProvider = {
  name: "Manual CSV",
  async discover(_criteria: DiscoveryCriteria) {
    return [];
  }
};
