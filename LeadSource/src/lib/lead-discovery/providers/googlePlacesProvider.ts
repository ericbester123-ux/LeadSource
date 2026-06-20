import { DiscoveryCriteria, DiscoveryProvider } from "../types";
import { getMockDiscoveryLeads } from "./mockDiscoveryData";

type GooglePlaceSearchResult = {
  place_id?: string;
  name?: string;
  formatted_address?: string;
  rating?: number;
  user_ratings_total?: number;
};

type GooglePlaceDetailsResult = {
  website?: string;
  formatted_phone_number?: string;
  international_phone_number?: string;
  url?: string;
};

function query(criteria: DiscoveryCriteria) {
  return [
    criteria.keyword,
    criteria.keywords,
    criteria.companyType,
    criteria.niche,
    criteria.industry,
    criteria.city,
    criteria.regionState,
    criteria.country
  ].filter(Boolean).join(" ");
}

export const googlePlacesProvider: DiscoveryProvider = {
  name: "Google Places",
  async discover(criteria: DiscoveryCriteria) {
    if (!process.env.GOOGLE_PLACES_API_KEY) {
      return getMockDiscoveryLeads(criteria, "Mock Google Places");
    }

    try {
      const url = new URL("https://maps.googleapis.com/maps/api/place/textsearch/json");
      url.searchParams.set("query", query(criteria) || "real estate agents");
      url.searchParams.set("key", process.env.GOOGLE_PLACES_API_KEY);
      const response = await fetch(url, { cache: "no-store" });
      const payload = await response.json() as { results?: GooglePlaceSearchResult[]; error_message?: string; status?: string };
      if (!response.ok || payload.status === "REQUEST_DENIED") throw new Error(payload.error_message || "Google Places request failed.");
      const places = (payload.results ?? []).slice(0, Math.max(1, Math.min(criteria.maxLeads || 10, 20)));
      return Promise.all(places.map(async (place, index) => {
        const details = place.place_id ? await getPlaceDetails(place.place_id) : null;
        return {
          companyName: place.name || `Google Places Business ${index + 1}`,
          email: undefined,
          phone: details?.international_phone_number || details?.formatted_phone_number,
          website: details?.website,
          location: place.formatted_address,
          city: criteria.city,
          stateRegion: criteria.regionState,
          country: criteria.country,
          industry: criteria.industry || "Real Estate",
          niche: criteria.niche,
          sourceUrl: details?.url || (place.place_id ? `https://www.google.com/maps/place/?q=place_id:${place.place_id}` : "https://www.google.com/maps"),
          sourcePlatform: "Google Places",
          discoveryQuery: query(criteria),
          dateDiscovered: new Date(),
          confidenceScore: Math.max(criteria.minLeadScore || 65, 70),
          contactType: "Business Listing",
          googlePlaceId: place.place_id,
          googleRating: place.rating,
          googleReviewsCount: place.user_ratings_total,
          leadSourceNotes: "Google Places result. Email may require manual enrichment before outreach."
        };
      }));
    } catch {
      return getMockDiscoveryLeads(criteria, "Mock Google Places");
    }
  }
};

async function getPlaceDetails(placeId: string): Promise<GooglePlaceDetailsResult | null> {
  try {
    const url = new URL("https://maps.googleapis.com/maps/api/place/details/json");
    url.searchParams.set("place_id", placeId);
    url.searchParams.set("fields", "website,formatted_phone_number,international_phone_number,url");
    url.searchParams.set("key", process.env.GOOGLE_PLACES_API_KEY ?? "");
    const response = await fetch(url, { cache: "no-store" });
    const payload = await response.json() as { result?: GooglePlaceDetailsResult; status?: string };
    if (!response.ok || payload.status === "REQUEST_DENIED") return null;
    return payload.result ?? null;
  } catch {
    return null;
  }
}
