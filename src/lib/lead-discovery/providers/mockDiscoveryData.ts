import { DiscoveryCriteria, DiscoveredLead } from "../types";

const ukCities = ["London", "Manchester", "Birmingham", "Leeds", "Bristol"];
const usCities = ["Miami", "Dallas", "New York", "Los Angeles", "Orlando"];

function slug(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "").slice(0, 32);
}

export function getMockDiscoveryLeads(criteria: DiscoveryCriteria, sourcePlatform: string): DiscoveredLead[] {
  const isUk = criteria.country.toLowerCase().includes("kingdom") || criteria.country.toLowerCase().includes("uk");
  const cities = criteria.city ? [criteria.city] : isUk ? ukCities : usCities;
  const max = Math.max(1, Math.min(criteria.maxLeads || 10, 25));
  const query = [
    criteria.keywords,
    criteria.companyType,
    criteria.niche,
    criteria.industry,
    criteria.city,
    criteria.regionState,
    criteria.country
  ].filter(Boolean).join(" ");

  return Array.from({ length: max }).map((_, index) => {
    const city = cities[index % cities.length];
    const suffix = index + 1;
    const companyType = criteria.companyType || (isUk ? "Estate Agency" : "Realty Group");
    const companyName = `${city} ${companyType} ${suffix}`;
    const domain = `${slug(city)}${slug(companyType)}${suffix}.example.com`;

    return {
      firstName: ["Ava", "James", "Maya", "Noah", "Olivia"][index % 5],
      lastName: ["Reed", "Porter", "Chen", "Brooks", "Hart"][index % 5],
      fullName: undefined,
      email: `hello@${domain}`,
      phone: isUk ? `+44 20 7000 ${String(1000 + index)}` : `+1 305 555 ${String(1000 + index)}`,
      companyName,
      website: `https://${domain}`,
      location: `${city}, ${criteria.regionState || criteria.country}`,
      city,
      stateRegion: criteria.regionState,
      country: criteria.country,
      industry: criteria.industry || "Real Estate",
      niche: criteria.niche || (isUk ? "Estate agents and letting agents" : "Real estate brokers and agencies"),
      sourceUrl: `https://${domain}/contact`,
      sourcePlatform,
      discoveryQuery: query || "real estate agents",
      confidenceScore: Math.max(criteria.minLeadScore || 65, 72 + (index % 21)),
      personalisationNote: `I noticed ${companyName} is active in the ${city} property market.`,
      contactType: "Generic Business Email"
    };
  });
}
