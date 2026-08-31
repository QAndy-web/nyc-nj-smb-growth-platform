import type { LeadScore, WebsiteStatus } from "@growth/scoring";

export type Coordinates = { latitude: number; longitude: number };

export type Territory = {
  id: string;
  label: string;
  state: "NY" | "NJ";
  city: string;
  bounds: { south: number; west: number; north: number; east: number };
};

export type BusinessCategory = {
  id: string;
  label: string;
  query: string;
  googleType: string;
  value: "low" | "medium" | "high";
};

export type PlaceBusiness = {
  placeId: string;
  name: string;
  address: string | null;
  location: Coordinates | null;
  rating: number | null;
  reviewCount: number;
  websiteUrl: string | null;
  phone: string | null;
  mapsUrl: string | null;
  businessStatus: string | null;
  googleTypes: string[];
  raw: Record<string, unknown>;
};

export type PlaceSearchRequest = {
  center: Coordinates;
  radiusMeters: number;
  category: BusinessCategory;
  pageToken?: string;
  pageSize?: number;
};

export type PlaceSearchPage = { places: PlaceBusiness[]; nextPageToken?: string };

export interface PlacesProvider {
  searchPage(request: PlaceSearchRequest): Promise<PlaceSearchPage>;
}

export type WebsiteAudit = {
  checkedUrl: string | null;
  finalUrl: string | null;
  status: WebsiteStatus;
  httpStatus: number | null;
  latencyMs: number | null;
  mobileFriendly: boolean | null;
  hasClearCta: boolean | null;
  checkedAt: string;
  error: string | null;
};

export type ContactSource = {
  email: string;
  sourceUrl: string;
  extractionMethod: "mailto" | "page_text";
  confidence: "high" | "medium";
};

export type ContactEnrichment = {
  status: "found" | "not_found" | "skipped" | "error";
  contacts: ContactSource[];
  pagesScanned: string[];
  error: string | null;
};

export type BusinessRecord = PlaceBusiness & {
  territoryId: string;
  state: "NY" | "NJ";
  city: string;
  categoryId: string;
};

export interface LeadRepository {
  startRun(input: { territoryId: string; categoryId: string }): Promise<string>;
  upsertBusiness(input: BusinessRecord): Promise<string>;
  saveWebsiteAudit(businessId: string, audit: WebsiteAudit): Promise<void>;
  saveContactEnrichment(
    businessId: string,
    enrichment: ContactEnrichment,
  ): Promise<void>;
  saveScore(businessId: string, score: LeadScore): Promise<void>;
  completeRun(
    runId: string,
    result: {
      status: "completed" | "partial" | "failed";
      cellsScanned: number;
      placesFetched: number;
      businessesUpserted: number;
      errors: number;
      errorMessage?: string;
    },
  ): Promise<void>;
}
