import { DiscoveryProvider } from "./types";
import { googlePlacesProvider } from "./googlePlacesProvider";
import { mockLeadDiscoveryProvider } from "./mockLeadDiscoveryProvider";
import { serpApiProviderPlaceholder } from "./serpApiProviderPlaceholder";

export type LeadDiscoveryProviderName = "mock" | "google_places" | "serpapi";

export type LeadDiscoveryProviderStatus = {
  selectedProvider: LeadDiscoveryProviderName;
  providerLabel: string;
  apiKeyConfigured: boolean;
  googlePlacesConfigured: boolean;
  serpApiConfigured: boolean;
  mockFallbackActive: boolean;
};

export function getSelectedLeadDiscoveryProvider(): LeadDiscoveryProviderName {
  const provider = (process.env.LEAD_DISCOVERY_PROVIDER ?? "mock").toLowerCase();
  if (provider === "google_places" || provider === "serpapi") return provider;
  return "mock";
}

export function getLeadDiscoveryProvider(): DiscoveryProvider {
  const selected = getSelectedLeadDiscoveryProvider();
  if (selected === "google_places" && process.env.GOOGLE_PLACES_API_KEY) return googlePlacesProvider;
  if (selected === "serpapi" && process.env.SERP_API_KEY) return serpApiProviderPlaceholder;
  return mockLeadDiscoveryProvider;
}

export function getLeadDiscoveryProviderStatus(): LeadDiscoveryProviderStatus {
  const selectedProvider = getSelectedLeadDiscoveryProvider();
  const googlePlacesConfigured = Boolean(process.env.GOOGLE_PLACES_API_KEY);
  const serpApiConfigured = Boolean(process.env.SERP_API_KEY);
  const apiKeyConfigured = selectedProvider === "google_places" ? googlePlacesConfigured : selectedProvider === "serpapi" ? serpApiConfigured : true;
  const provider = getLeadDiscoveryProvider();
  return {
    selectedProvider,
    providerLabel: provider.name,
    apiKeyConfigured,
    googlePlacesConfigured,
    serpApiConfigured,
    mockFallbackActive: provider.name === "Mock Discovery"
  };
}
