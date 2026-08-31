import type {
  BusinessRecord,
  ContactEnrichment,
  LeadRepository,
  WebsiteAudit,
} from "@growth/lead-engine";
import type { LeadScore } from "@growth/scoring";
import { createAdminClient } from "./supabase";

function fail(context: string, error: { message: string } | null): never {
  throw new Error(`${context}: ${error?.message ?? "unknown database error"}`);
}

export class SupabaseLeadRepository implements LeadRepository {
  private readonly client = createAdminClient();

  async startRun(input: { territoryId: string; categoryId: string }): Promise<string> {
    const { data, error } = await this.client
      .from("ingestion_runs")
      .insert({ territory_id: input.territoryId, category_id: input.categoryId })
      .select("id")
      .single();
    if (error || !data) fail("Could not start ingestion run", error);
    return data.id as string;
  }

  async upsertBusiness(input: BusinessRecord): Promise<string> {
    const { data, error } = await this.client
      .from("businesses")
      .upsert(
        {
          google_place_id: input.placeId,
          name: input.name,
          address: input.address,
          latitude: input.location?.latitude ?? null,
          longitude: input.location?.longitude ?? null,
          state: input.state,
          city: input.city,
          territory_id: input.territoryId,
          category_id: input.categoryId,
          rating: input.rating,
          review_count: input.reviewCount,
          website_url: input.websiteUrl,
          phone: input.phone,
          google_maps_url: input.mapsUrl,
          business_status: input.businessStatus,
          google_types: input.googleTypes,
          provider_payload: input.raw,
          last_seen_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        { onConflict: "google_place_id" },
      )
      .select("id")
      .single();
    if (error || !data) fail("Could not upsert business", error);
    return data.id as string;
  }

  async saveWebsiteAudit(businessId: string, audit: WebsiteAudit): Promise<void> {
    const { error } = await this.client.from("website_audits").insert({
      business_id: businessId,
      checked_url: audit.checkedUrl,
      final_url: audit.finalUrl,
      status: audit.status,
      http_status: audit.httpStatus,
      latency_ms: audit.latencyMs,
      mobile_friendly: audit.mobileFriendly,
      has_clear_cta: audit.hasClearCta,
      error_message: audit.error,
      checked_at: audit.checkedAt,
    });
    if (error) fail("Could not save website audit", error);
  }

  async saveContactEnrichment(businessId: string, enrichment: ContactEnrichment): Promise<void> {
    if (enrichment.contacts.length === 0) return;
    const { error } = await this.client.from("contact_sources").upsert(
      enrichment.contacts.map((contact) => ({
        business_id: businessId,
        email: contact.email,
        source_url: contact.sourceUrl,
        extraction_method: contact.extractionMethod,
        confidence: contact.confidence,
        status: "found",
        error_message: enrichment.error,
      })),
      { onConflict: "business_id,email,source_url", ignoreDuplicates: true },
    );
    if (error) fail("Could not save public contact sources", error);
  }

  async saveScore(businessId: string, score: LeadScore): Promise<void> {
    const { error } = await this.client.from("business_scores").upsert(
      {
        business_id: businessId,
        business_quality: score.businessQuality,
        digital_weakness: score.digitalWeakness,
        revenue_potential: score.revenuePotential,
        opportunity_score: score.opportunity,
        tier: score.tier,
        scored_at: new Date().toISOString(),
      },
      { onConflict: "business_id" },
    );
    if (error) fail("Could not save opportunity score", error);
  }

  async completeRun(
    runId: string,
    result: {
      status: "completed" | "partial" | "failed";
      cellsScanned: number;
      placesFetched: number;
      businessesUpserted: number;
      errors: number;
      errorMessage?: string;
    },
  ): Promise<void> {
    const { error } = await this.client
      .from("ingestion_runs")
      .update({
        status: result.status,
        cells_scanned: result.cellsScanned,
        places_fetched: result.placesFetched,
        businesses_upserted: result.businessesUpserted,
        error_count: result.errors,
        error_message: result.errorMessage ?? null,
        completed_at: new Date().toISOString(),
      })
      .eq("id", runId);
    if (error) fail("Could not complete ingestion run", error);
  }
}
