import { describe, expect, it, vi } from "vitest";
import { runIngestion } from "./pipeline";
import type { LeadRepository, PlacesProvider } from "./types";

describe("runIngestion", () => {
  it("deduplicates place IDs across grid cells before repository upserts", async () => {
    const provider: PlacesProvider = {
      searchPage: vi.fn().mockResolvedValue({
        places: [{ placeId: "same-place", name: "A", address: "Jersey City, NJ", location: { latitude: 40.72, longitude: -74.07 }, rating: 4.8, reviewCount: 100, websiteUrl: null, phone: null, mapsUrl: null, businessStatus: "OPERATIONAL", googleTypes: [], raw: {} }],
      }),
    };
    const repository: LeadRepository = {
      startRun: vi.fn().mockResolvedValue("run-1"),
      upsertBusiness: vi.fn().mockResolvedValue("business-1"),
      saveWebsiteAudit: vi.fn().mockResolvedValue(undefined),
      saveContactEnrichment: vi.fn().mockResolvedValue(undefined),
      saveScore: vi.fn().mockResolvedValue(undefined),
      markBusinessQualityNeedsReaudit: vi.fn().mockResolvedValue(undefined),
      markBusinessQualityVerified: vi.fn().mockResolvedValue(undefined),
      completeRun: vi.fn().mockResolvedValue(undefined),
    };

    const result = await runIngestion(
      { provider, repository, logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() } },
      { territoryId: "jersey-city", categoryId: "dentists", maxCells: 2, maxPagesPerCell: 1 },
    );

    expect(provider.searchPage).toHaveBeenCalledTimes(2);
    expect(repository.upsertBusiness).toHaveBeenCalledTimes(1);
    expect(result.businessesUpserted).toBe(1);
  });

  it("stops enrichment at the explicit small-batch business limit", async () => {
    const places = Array.from({ length: 5 }, (_, index) => ({ placeId: `place-${index}`, name: `Business ${index}`, address: "Jersey City, NJ", location: { latitude: 40.72, longitude: -74.07 }, rating: 4.8, reviewCount: 100, websiteUrl: null, phone: null, mapsUrl: null, businessStatus: "OPERATIONAL", googleTypes: [], raw: {} }));
    const provider: PlacesProvider = { searchPage: vi.fn().mockResolvedValue({ places }) };
    const repository: LeadRepository = {
      startRun: vi.fn().mockResolvedValue("run-2"),
      upsertBusiness: vi.fn().mockImplementation(async (input) => input.placeId),
      saveWebsiteAudit: vi.fn().mockResolvedValue(undefined),
      saveContactEnrichment: vi.fn().mockResolvedValue(undefined),
      saveScore: vi.fn().mockResolvedValue(undefined),
      markBusinessQualityNeedsReaudit: vi.fn().mockResolvedValue(undefined),
      markBusinessQualityVerified: vi.fn().mockResolvedValue(undefined),
      completeRun: vi.fn().mockResolvedValue(undefined),
    };

    const result = await runIngestion(
      { provider, repository, logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() } },
      { territoryId: "jersey-city", categoryId: "hvac", maxCells: 2, maxPagesPerCell: 1, maxBusinesses: 3 },
    );

    expect(result.businessesUpserted).toBe(3);
    expect(repository.saveScore).toHaveBeenCalledTimes(3);
  });

  it("does not spend audit work on pilot leads below operating-signal minimums", async () => {
    const provider: PlacesProvider = {
      searchPage: vi.fn().mockResolvedValue({
        places: [{ placeId: "weak-signal", name: "New HVAC", address: "Jersey City, NJ", location: { latitude: 40.72, longitude: -74.07 }, rating: 4.1, reviewCount: 8, websiteUrl: "https://example.com", phone: null, mapsUrl: null, businessStatus: "OPERATIONAL", googleTypes: [], raw: {} }],
      }),
    };
    const repository: LeadRepository = {
      startRun: vi.fn().mockResolvedValue("run-3"),
      upsertBusiness: vi.fn().mockResolvedValue("business-3"),
      saveWebsiteAudit: vi.fn().mockResolvedValue(undefined),
      saveContactEnrichment: vi.fn().mockResolvedValue(undefined),
      saveScore: vi.fn().mockResolvedValue(undefined),
      markBusinessQualityNeedsReaudit: vi.fn().mockResolvedValue(undefined),
      markBusinessQualityVerified: vi.fn().mockResolvedValue(undefined),
      completeRun: vi.fn().mockResolvedValue(undefined),
    };
    const audit = vi.fn();

    const result = await runIngestion(
      { provider, repository, audit, logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() } },
      { territoryId: "jersey-city", categoryId: "hvac", maxCells: 1, maxPagesPerCell: 1 },
    );

    expect(result.businessesUpserted).toBe(0);
    expect(repository.upsertBusiness).not.toHaveBeenCalled();
    expect(audit).not.toHaveBeenCalled();
  });
});
