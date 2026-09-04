import { createTerritoryGrid, getCategory, getIndustryPilotProfile, getTerritory, scoreLeadForCategory } from "./config";
import { enrichPublicBusinessContacts } from "./email-enrichment";
import { auditWebsite } from "./website-audit";
import type { LeadRepository, PlacesProvider } from "./types";

function isInTerritory(
  place: { location: { latitude: number; longitude: number } | null; address: string | null },
  territory: ReturnType<typeof getTerritory>,
): boolean {
  if (place.location) {
    const { latitude, longitude } = place.location;
    return (
      latitude >= territory.bounds.south &&
      latitude <= territory.bounds.north &&
      longitude >= territory.bounds.west &&
      longitude <= territory.bounds.east
    );
  }
  const address = place.address?.toLowerCase() ?? "";
  return address.includes(territory.city.toLowerCase()) && address.includes(territory.state.toLowerCase());
}

export type IngestionOptions = {
  territoryId: string;
  categoryId: string;
  maxCells?: number;
  maxPagesPerCell?: number;
  gridSpacingMeters?: number;
  searchRadiusMeters?: number;
  maxBusinesses?: number;
};

export type IngestionSummary = {
  runId: string;
  status: "completed" | "partial";
  cellsScanned: number;
  placesFetched: number;
  businessesUpserted: number;
  errors: number;
};

export async function runIngestion(
  dependencies: {
    provider: PlacesProvider;
    repository: LeadRepository;
    audit?: typeof auditWebsite;
    enrich?: typeof enrichPublicBusinessContacts;
    logger?: Pick<Console, "info" | "warn" | "error">;
  },
  options: IngestionOptions,
): Promise<IngestionSummary> {
  const territory = getTerritory(options.territoryId);
  const category = getCategory(options.categoryId);
  const grid = createTerritoryGrid(territory, options.gridSpacingMeters ?? 3_500).slice(
    0,
    Math.max(1, options.maxCells ?? 2),
  );
  const runId = await dependencies.repository.startRun({
    territoryId: territory.id,
    categoryId: category.id,
  });
  const audit = dependencies.audit ?? auditWebsite;
  const enrich = dependencies.enrich ?? enrichPublicBusinessContacts;
  const pilotProfile = getIndustryPilotProfile(category.id);
  const logger = dependencies.logger ?? console;
  const seenPlaceIds = new Set<string>();
  let placesFetched = 0;
  let businessesUpserted = 0;
  let errors = 0;
  let cellsScanned = 0;
  const maxBusinesses = Math.max(1, options.maxBusinesses ?? 20);
  let limitReached = false;

  try {
    for (const center of grid) {
      if (limitReached) break;
      cellsScanned += 1;
      let pageToken: string | undefined;
      let page = 0;
      do {
        try {
          const result = await dependencies.provider.searchPage({
            center,
            radiusMeters: options.searchRadiusMeters ?? 2_500,
            category,
            pageToken,
            pageSize: 20,
          });
          placesFetched += result.places.length;
          pageToken = result.nextPageToken;

          for (const place of result.places) {
            if (businessesUpserted >= maxBusinesses) {
              limitReached = true;
              break;
            }
            if (!isInTerritory(place, territory)) continue;
            if (
              pilotProfile &&
              ((place.rating ?? 0) < pilotProfile.minimumRating || place.reviewCount < pilotProfile.minimumReviews)
            ) continue;
            if (seenPlaceIds.has(place.placeId)) continue;
            seenPlaceIds.add(place.placeId);
            try {
              const businessId = await dependencies.repository.upsertBusiness({
                ...place,
                territoryId: territory.id,
                state: territory.state,
                city: territory.city,
                categoryId: category.id,
              });
              businessesUpserted += 1;
              await dependencies.repository.markBusinessQualityNeedsReaudit(businessId, "ingestion_in_progress");

              const websiteAudit = await audit(place.websiteUrl);
              await dependencies.repository.saveWebsiteAudit(businessId, websiteAudit);

              const enrichment =
                websiteAudit.status === "unreachable"
                  ? { status: "skipped" as const, contacts: [], pagesScanned: [], error: "Website is unreachable" }
                  : await enrich(websiteAudit.finalUrl ?? place.websiteUrl);
              if (enrichment.status === "error") {
                throw new Error(enrichment.error ?? "Public contact enrichment was inconclusive");
              }
              await dependencies.repository.saveContactEnrichment(businessId, enrichment);

              const score = scoreLeadForCategory(category.id, {
                rating: place.rating,
                reviewCount: place.reviewCount,
                websiteStatus: websiteAudit.status,
                mobileFriendly: websiteAudit.mobileFriendly,
                hasClearCta: websiteAudit.hasClearCta,
                publicEmailFound: enrichment.contacts.length > 0,
                phoneAvailable: Boolean(place.phone),
              });
              await dependencies.repository.saveScore(businessId, score);
              await dependencies.repository.markBusinessQualityVerified(businessId);
            } catch (error) {
              errors += 1;
              logger.warn("Business processing failed", { placeId: place.placeId, error });
            }
          }
        } catch (error) {
          errors += 1;
          pageToken = undefined;
          logger.warn("Grid cell search failed", { center, error });
        }
        page += 1;
      } while (pageToken && page < Math.max(1, options.maxPagesPerCell ?? 2));
    }

    const status = errors > 0 ? "partial" : "completed";
    await dependencies.repository.completeRun(runId, {
      status,
      cellsScanned,
      placesFetched,
      businessesUpserted,
      errors,
    });
    logger.info("Ingestion completed", { runId, status, businessesUpserted, errors });
    return { runId, status, cellsScanned, placesFetched, businessesUpserted, errors };
  } catch (error) {
    await dependencies.repository.completeRun(runId, {
      status: "failed",
      cellsScanned,
      placesFetched,
      businessesUpserted,
      errors: errors + 1,
      errorMessage: error instanceof Error ? error.message : "Ingestion failed",
    });
    throw error;
  }
}
