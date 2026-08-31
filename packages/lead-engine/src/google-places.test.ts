import { describe, expect, it, vi } from "vitest";
import { BUSINESS_CATEGORIES } from "./config";
import { GooglePlacesProvider, parseGooglePlace } from "./google-places";

describe("Google Places provider", () => {
  it("parses a provider place into the canonical business shape", () => {
    expect(
      parseGooglePlace({ id: "place-1", displayName: { text: "Good Dental" }, rating: 4.8, userRatingCount: 120 }),
    ).toMatchObject({ placeId: "place-1", name: "Good Dental", rating: 4.8, reviewCount: 120 });
    expect(parseGooglePlace({ displayName: { text: "Missing id" } })).toBeNull();
  });

  it("retries rate-limited requests and preserves pagination", async () => {
    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(new Response("rate limited", { status: 429 }))
      .mockResolvedValueOnce(
        Response.json({ places: [{ id: "place-1", displayName: { text: "Good Dental" } }], nextPageToken: "next" }),
      );
    const provider = new GooglePlacesProvider({
      apiKey: "test-key",
      fetchImpl,
      minRequestIntervalMs: 0,
      sleep: async () => undefined,
    });
    const result = await provider.searchPage({
      center: { latitude: 40.72, longitude: -74.04 },
      radiusMeters: 1_000,
      category: BUSINESS_CATEGORIES[0],
    });

    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(result.nextPageToken).toBe("next");
    expect(result.places[0].placeId).toBe("place-1");
  });
});
