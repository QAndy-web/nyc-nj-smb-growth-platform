import type {
  PlaceBusiness,
  PlaceSearchPage,
  PlaceSearchRequest,
  PlacesProvider,
} from "./types";

type Fetch = typeof fetch;
type GooglePlace = {
  id?: string;
  displayName?: { text?: string };
  formattedAddress?: string;
  location?: { latitude?: number; longitude?: number };
  rating?: number;
  userRatingCount?: number;
  websiteUri?: string;
  nationalPhoneNumber?: string;
  googleMapsUri?: string;
  businessStatus?: string;
  types?: string[];
  [key: string]: unknown;
};

const RETRYABLE_STATUS = new Set([429, 500, 502, 503, 504]);
const FIELD_MASK = [
  "places.id",
  "places.displayName",
  "places.formattedAddress",
  "places.location",
  "places.rating",
  "places.userRatingCount",
  "places.websiteUri",
  "places.nationalPhoneNumber",
  "places.googleMapsUri",
  "places.businessStatus",
  "places.types",
  "nextPageToken",
].join(",");

export function parseGooglePlace(place: GooglePlace): PlaceBusiness | null {
  if (!place.id || !place.displayName?.text) return null;

  const latitude = place.location?.latitude;
  const longitude = place.location?.longitude;
  return {
    placeId: place.id,
    name: place.displayName.text,
    address: place.formattedAddress ?? null,
    location:
      typeof latitude === "number" && typeof longitude === "number"
        ? { latitude, longitude }
        : null,
    rating: typeof place.rating === "number" ? place.rating : null,
    reviewCount: place.userRatingCount ?? 0,
    websiteUrl: place.websiteUri ?? null,
    phone: place.nationalPhoneNumber ?? null,
    mapsUrl: place.googleMapsUri ?? null,
    businessStatus: place.businessStatus ?? null,
    googleTypes: place.types ?? [],
    raw: place,
  };
}

export class GooglePlacesProvider implements PlacesProvider {
  private lastRequestAt = 0;

  constructor(
    private readonly options: {
      apiKey: string;
      fetchImpl?: Fetch;
      maxRetries?: number;
      minRequestIntervalMs?: number;
      sleep?: (milliseconds: number) => Promise<void>;
    },
  ) {
    if (!options.apiKey.trim()) throw new Error("GOOGLE_MAPS_API_KEY is required for Google Places ingestion.");
  }

  async searchPage(request: PlaceSearchRequest): Promise<PlaceSearchPage> {
    const fetchImpl = this.options.fetchImpl ?? fetch;
    const sleep = this.options.sleep ?? ((milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds)));
    const maxRetries = this.options.maxRetries ?? 4;

    for (let attempt = 0; ; attempt += 1) {
      const interval = this.options.minRequestIntervalMs ?? 150;
      const remaining = this.lastRequestAt + interval - Date.now();
      if (remaining > 0) await sleep(remaining);
      this.lastRequestAt = Date.now();

      let response: Response;
      try {
        response = await fetchImpl("https://places.googleapis.com/v1/places:searchText", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Goog-Api-Key": this.options.apiKey,
            "X-Goog-FieldMask": FIELD_MASK,
          },
          body: JSON.stringify({
            textQuery: request.category.query,
            pageSize: Math.min(Math.max(request.pageSize ?? 20, 1), 20),
            ...(request.pageToken ? { pageToken: request.pageToken } : {}),
            locationBias: {
              circle: { center: request.center, radius: request.radiusMeters },
            },
            languageCode: "en",
            regionCode: "US",
            includePureServiceAreaBusinesses: true,
          }),
        });
      } catch (error) {
        if (attempt >= maxRetries) throw new Error(`Google Places request failed: ${error instanceof Error ? error.message : "network error"}`);
        await sleep(250 * 2 ** attempt);
        continue;
      }

      if (response.ok) {
        const payload = (await response.json()) as { places?: GooglePlace[]; nextPageToken?: string };
        return {
          places: (payload.places ?? []).map(parseGooglePlace).filter((place): place is PlaceBusiness => place !== null),
          nextPageToken: payload.nextPageToken,
        };
      }

      const errorBody = (await response.text()).slice(0, 500);
      if (!RETRYABLE_STATUS.has(response.status) || attempt >= maxRetries) {
        throw new Error(`Google Places returned ${response.status}: ${errorBody || response.statusText}`);
      }

      const retryAfter = Number(response.headers.get("retry-after"));
      await sleep(Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : 250 * 2 ** attempt);
    }
  }
}
