import { createHash } from "node:crypto";
import type {
  BusinessRecord,
  ContactEnrichment,
  ExistingLeadForReaudit,
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

  private async recordObservation(input: {
    subjectType: "company" | "website" | "contact" | "website_audit" | "opportunity";
    subjectId?: string;
    sourceType: string;
    sourceRecordId: string;
    sourceUrl?: string | null;
    observedValue: Record<string, unknown>;
    confidence: number;
    observedAt: string;
  }): Promise<string> {
    const fingerprint = createHash("sha256").update(JSON.stringify(input.observedValue)).digest("hex");
    const { data, error } = await this.client
      .from("observations")
      .upsert(
        {
          subject_type: input.subjectType,
          ...(input.subjectId ? { subject_id: input.subjectId } : {}),
          source_type: input.sourceType,
          source_record_id: input.sourceRecordId,
          source_url: input.sourceUrl ?? null,
          observed_value: input.observedValue,
          fingerprint,
          confidence: input.confidence,
          observed_at: input.observedAt,
          recorded_by_type: "system",
          recorded_by_id: "lead-engine",
        },
        { onConflict: "source_type,source_record_id,fingerprint" },
      )
      .select("id")
      .single();
    if (error || !data) fail("Could not record raw observation", error);
    const observationId = data.id as string;
    await this.recordEvent({
      eventType: "observation.recorded",
      aggregateType: "observation",
      aggregateId: observationId,
      evidenceIds: [observationId],
      payload: { subjectType: input.subjectType, sourceType: input.sourceType },
      idempotencyKey: `observation.recorded:${observationId}`,
    });
    return observationId;
  }

  private async promoteFact(input: {
    subjectType: "company" | "website" | "contact" | "website_audit" | "opportunity";
    subjectId: string;
    fieldName: string;
    value: unknown;
    status: "candidate" | "accepted" | "rejected";
    confidence: number;
    observationId: string;
    resolver: string;
  }): Promise<void> {
    const { error } = await this.client.rpc("promote_fact", {
      p_subject_type: input.subjectType,
      p_subject_id: input.subjectId,
      p_field_name: input.fieldName,
      p_value: input.value,
      p_status: input.status,
      p_confidence: input.confidence,
      p_observation_id: input.observationId,
      p_resolver: input.resolver,
      p_actor_type: "system",
      p_actor_id: "lead-engine",
    });
    if (error) fail(`Could not promote ${input.fieldName} fact`, error);
  }

  private async recordEvent(input: {
    eventType: "observation.recorded" | "company.verified" | "website.verified" | "audit.completed" | "contact.verified";
    aggregateType: string;
    aggregateId: string;
    evidenceIds: string[];
    payload?: Record<string, unknown>;
    idempotencyKey: string;
  }): Promise<void> {
    const { error } = await this.client.from("domain_events").upsert(
      {
        event_type: input.eventType,
        aggregate_type: input.aggregateType,
        aggregate_id: input.aggregateId,
        payload: input.payload ?? {},
        evidence_ids: input.evidenceIds,
        actor_type: "system",
        actor_id: "lead-engine",
        idempotency_key: input.idempotencyKey,
      },
      { onConflict: "idempotency_key", ignoreDuplicates: true },
    );
    if (error) fail(`Could not record ${input.eventType} event`, error);
  }

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
    const observedAt = new Date().toISOString();
    const observedValue = {
      externalId: input.placeId,
      name: input.name,
      address: input.address,
      location: input.location,
      rating: input.rating,
      reviewCount: input.reviewCount,
      websiteUrl: input.websiteUrl,
      phone: input.phone,
      mapsUrl: input.mapsUrl,
      businessStatus: input.businessStatus,
      googleTypes: input.googleTypes,
      providerPayload: input.raw,
    };
    const observationId = await this.recordObservation({
      subjectType: "company",
      sourceType: "google_places",
      sourceRecordId: input.placeId,
      sourceUrl: input.mapsUrl,
      observedValue,
      confidence: 0.9,
      observedAt,
    });
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
          company_state: "verified",
          state_updated_at: observedAt,
          last_evidence_ids: [observationId],
          last_actor_type: "system",
          last_actor_id: "google-place-id-resolver-v1",
          last_seen_at: observedAt,
          updated_at: observedAt,
        },
        { onConflict: "google_place_id" },
      )
      .select("id")
      .single();
    if (error || !data) fail("Could not upsert business", error);
    const businessId = data.id as string;
    const { error: linkError } = await this.client.from("observations").update({ subject_id: businessId }).eq("id", observationId);
    if (linkError) fail("Could not link company observation", linkError);

    const facts: Array<{ fieldName: string; value: unknown; status: "candidate" | "accepted" }> = [
      { fieldName: "name", value: input.name, status: "accepted" },
      { fieldName: "address", value: input.address, status: "accepted" },
      { fieldName: "phone", value: input.phone, status: "accepted" },
      { fieldName: "website_url", value: input.websiteUrl, status: "candidate" },
    ];
    await Promise.all(
      facts
        .filter((fact) => fact.value !== null && fact.value !== undefined)
        .map((fact) => this.promoteFact({
          subjectType: "company",
          subjectId: businessId,
          fieldName: fact.fieldName,
          value: fact.value,
          status: fact.status,
          confidence: fact.status === "accepted" ? 0.9 : 0.75,
          observationId,
          resolver: "google-place-id-resolver-v1",
        })),
    );
    await this.recordEvent({
      eventType: "company.verified",
      aggregateType: "company",
      aggregateId: businessId,
      evidenceIds: [observationId],
      payload: { externalIdentity: input.placeId },
      idempotencyKey: `company.verified:${businessId}:${observationId}`,
    });
    return businessId;
  }

  async saveWebsiteAudit(businessId: string, audit: WebsiteAudit): Promise<void> {
    const observationId = await this.recordObservation({
      subjectType: "website_audit",
      sourceType: "website_audit",
      sourceRecordId: `${businessId}:${audit.checkedAt}`,
      sourceUrl: audit.finalUrl ?? audit.checkedUrl,
      observedValue: { ...audit },
      confidence: audit.status === "unknown" ? 0.4 : 0.85,
      observedAt: audit.checkedAt,
    });
    const observedUrl = audit.checkedUrl ?? audit.finalUrl;
    let websiteId: string | null = null;
    if (observedUrl) {
      const existing = await this.client
        .from("websites")
        .select("id,canonical_url")
        .eq("company_id", businessId)
        .eq("observed_url", observedUrl)
        .maybeSingle();
      if (existing.error) fail("Could not load website identity", existing.error);
      const verificationStatus = audit.status === "reachable" || audit.status === "weak"
        ? "verified"
        : audit.status === "unreachable"
          ? "rejected"
          : "unknown";
      const websiteRow = {
        company_id: businessId,
        observed_url: observedUrl,
        canonical_url: audit.status === "reachable" || audit.status === "weak"
          ? audit.finalUrl ?? observedUrl
          : existing.data?.canonical_url ?? null,
        verification_status: verificationStatus,
        source_observation_id: observationId,
        last_evidence_ids: [observationId],
        last_actor_type: "system",
        last_actor_id: "website-audit-v2",
        verified_at: verificationStatus === "verified" ? audit.checkedAt : null,
        updated_at: audit.checkedAt,
      };
      const persistedWebsite = existing.data
        ? await this.client.from("websites").update(websiteRow).eq("id", existing.data.id).select("id").single()
        : await this.client.from("websites").insert(websiteRow).select("id").single();
      if (persistedWebsite.error || !persistedWebsite.data) fail("Could not persist website identity", persistedWebsite.error);
      websiteId = persistedWebsite.data.id as string;
    }

    const inserted = await this.client.from("website_audits").insert({
      business_id: businessId,
      website_id: websiteId,
      checked_url: audit.checkedUrl,
      final_url: audit.finalUrl,
      status: audit.status,
      http_status: audit.httpStatus,
      latency_ms: audit.latencyMs,
      mobile_friendly: audit.mobileFriendly,
      has_clear_cta: audit.hasClearCta,
      error_message: audit.error,
      audit_state: audit.status === "unknown" ? "inconclusive" : "completed",
      evidence_observation_id: observationId,
      actor_type: "system",
      actor_id: "website-audit-v2",
      checked_at: audit.checkedAt,
    }).select("id").single();
    if (inserted.error || !inserted.data) fail("Could not save website audit", inserted.error);
    const auditId = inserted.data.id as string;
    const { error: linkError } = await this.client.from("observations").update({ subject_id: auditId }).eq("id", observationId);
    if (linkError) fail("Could not link audit observation", linkError);

    const findings = [
      {
        finding_key: "availability",
        category: "availability",
        severity: audit.status === "unreachable" ? "critical" : audit.status === "unknown" ? "medium" : "info",
        finding: `Website classified as ${audit.status}.`,
        observed_value: { status: audit.status, httpStatus: audit.httpStatus },
      },
      ...(audit.mobileFriendly === null ? [] : [{
        finding_key: "mobile_friendly",
        category: "mobile",
        severity: audit.mobileFriendly ? "info" : "high",
        finding: audit.mobileFriendly ? "Mobile viewport signal detected." : "Mobile viewport signal not detected.",
        observed_value: audit.mobileFriendly,
      }]),
      ...(audit.hasClearCta === null ? [] : [{
        finding_key: "clear_cta",
        category: "conversion",
        severity: audit.hasClearCta ? "info" : "medium",
        finding: audit.hasClearCta ? "Clear conversion CTA detected." : "Clear conversion CTA not detected.",
        observed_value: audit.hasClearCta,
      }]),
    ];
    const { error: findingsError } = await this.client.from("audit_findings").insert(
      findings.map((finding) => ({
        website_audit_id: auditId,
        ...finding,
        evidence_observation_id: observationId,
        source_url: audit.finalUrl ?? audit.checkedUrl,
      })),
    );
    if (findingsError) fail("Could not save audit findings", findingsError);
    await this.recordEvent({
      eventType: "audit.completed",
      aggregateType: "website_audit",
      aggregateId: auditId,
      evidenceIds: [observationId],
      payload: { status: audit.status, websiteId },
      idempotencyKey: `audit.completed:${auditId}`,
    });
    if (websiteId && (audit.status === "reachable" || audit.status === "weak")) {
      await this.promoteFact({
        subjectType: "website",
        subjectId: websiteId,
        fieldName: "canonical_url",
        value: audit.finalUrl ?? observedUrl,
        status: "accepted",
        confidence: 0.9,
        observationId,
        resolver: "website-audit-v2",
      });
      await this.recordEvent({
        eventType: "website.verified",
        aggregateType: "website",
        aggregateId: websiteId,
        evidenceIds: [observationId],
        payload: { canonicalUrl: audit.finalUrl ?? observedUrl },
        idempotencyKey: `website.verified:${websiteId}:${observationId}`,
      });
    }
  }

  async saveContactEnrichment(businessId: string, enrichment: ContactEnrichment): Promise<void> {
    const { error: supersedeError } = await this.client
      .from("contact_sources")
      .update({ quality_status: "superseded", quality_reason: "replaced_by_latest_audit", quality_reviewed_at: new Date().toISOString() })
      .eq("business_id", businessId)
      .in("quality_status", ["pending", "accepted"]);
    if (supersedeError) fail("Could not supersede prior public contact sources", supersedeError);

    const { error: supersedeCanonicalError } = await this.client
      .from("contacts")
      .update({
        verification_status: "superseded",
        last_actor_type: "system",
        last_actor_id: "public-contact-parser-v2",
        updated_at: new Date().toISOString(),
      })
      .eq("company_id", businessId)
      .eq("contact_type", "email")
      .in("verification_status", ["candidate", "verified"]);
    if (supersedeCanonicalError) fail("Could not supersede prior canonical contacts", supersedeCanonicalError);

    if (enrichment.contacts.length === 0) {
      await this.recordObservation({
        subjectType: "contact",
        subjectId: businessId,
        sourceType: "public_contact_scan",
        sourceRecordId: `${businessId}:${enrichment.pagesScanned.join("|") || "no-pages"}`,
        sourceUrl: enrichment.pagesScanned[0],
        observedValue: { status: enrichment.status, pagesScanned: enrichment.pagesScanned, error: enrichment.error },
        confidence: enrichment.status === "error" ? 0.3 : 0.7,
        observedAt: new Date().toISOString(),
      });
      return;
    }
    const { error } = await this.client.from("contact_sources").upsert(
      enrichment.contacts.map((contact) => ({
        business_id: businessId,
        email: contact.email,
        source_url: contact.sourceUrl,
        extraction_method: contact.extractionMethod,
        confidence: contact.confidence,
        status: "found",
        error_message: enrichment.error,
        quality_status: "accepted",
        quality_reason: "current_parser_validation",
        quality_reviewed_at: new Date().toISOString(),
        discovered_at: new Date().toISOString(),
      })),
      { onConflict: "business_id,email,source_url" },
    );
    if (error) fail("Could not save public contact sources", error);

    await Promise.all(enrichment.contacts.map(async (contact) => {
      const observedAt = new Date().toISOString();
      const observationId = await this.recordObservation({
        subjectType: "contact",
        sourceType: "public_contact_scan",
        sourceRecordId: `${businessId}:${contact.email}:${contact.sourceUrl}`,
        sourceUrl: contact.sourceUrl,
        observedValue: {
          email: contact.email,
          extractionMethod: contact.extractionMethod,
          confidence: contact.confidence,
        },
        confidence: contact.confidence === "high" ? 0.95 : 0.75,
        observedAt,
      });
      const persisted = await this.client.from("contacts").upsert(
        {
          company_id: businessId,
          contact_type: "email",
          value: contact.email,
          verification_status: "verified",
          public_source_only: true,
          source_url: contact.sourceUrl,
          source_observation_id: observationId,
          confidence: contact.confidence === "high" ? 0.95 : 0.75,
          last_evidence_ids: [observationId],
          last_actor_type: "system",
          last_actor_id: "public-contact-parser-v2",
          verified_at: observedAt,
          updated_at: observedAt,
        },
        { onConflict: "company_id,contact_type,value,source_url" },
      ).select("id").single();
      if (persisted.error || !persisted.data) fail("Could not persist canonical public contact", persisted.error);
      const contactId = persisted.data.id as string;
      const { error: linkError } = await this.client.from("observations").update({ subject_id: contactId }).eq("id", observationId);
      if (linkError) fail("Could not link contact observation", linkError);
      await this.promoteFact({
        subjectType: "contact",
        subjectId: contactId,
        fieldName: "value",
        value: contact.email,
        status: "accepted",
        confidence: contact.confidence === "high" ? 0.95 : 0.75,
        observationId,
        resolver: "public-contact-parser-v2",
      });
      await this.recordEvent({
        eventType: "contact.verified",
        aggregateType: "contact",
        aggregateId: contactId,
        evidenceIds: [observationId],
        payload: { companyId: businessId, contactType: "email" },
        idempotencyKey: `contact.verified:${contactId}:${observationId}`,
      });
    }));
  }

  async saveScore(businessId: string, score: LeadScore): Promise<void> {
    const { error } = await this.client.from("business_scores").upsert(
      {
        business_id: businessId,
        business_quality: score.businessQuality,
        digital_weakness: score.digitalWeakness,
        revenue_potential: score.revenuePotential,
        opportunity_score: score.opportunity,
        fit_score: score.fit,
        need_score: score.need,
        reachability_score: score.reachability,
        value_score: score.value,
        confidence_score: score.confidence,
        score_explanation: {
          fit: "Existing business-quality operating signals",
          need: "Existing digital-weakness signals",
          reachability: "Verified public email, public phone, or neither",
          value: "Category-specific revenue potential",
          confidence: "Coverage and reliability of current evidence",
          legacyOpportunityScorePreserved: true,
        },
        tier: score.tier,
        scoring_version: "phase1-v2",
        scored_at: new Date().toISOString(),
      },
      { onConflict: "business_id" },
    );
    if (error) fail("Could not save opportunity score", error);

    const existing = await this.client
      .from("opportunities")
      .select("id")
      .eq("company_id", businessId)
      .eq("is_current", true)
      .maybeSingle();
    if (existing.error) fail("Could not load current opportunity", existing.error);
    const opportunityScore = {
      legacy_opportunity_score: score.opportunity,
      fit_score: score.fit,
      need_score: score.need,
      reachability_score: score.reachability,
      value_score: score.value,
      confidence_score: score.confidence,
      scoring_version: "phase1-v2+ontology-v1",
      last_actor_type: "system",
      last_actor_id: "scoring-v2",
      updated_at: new Date().toISOString(),
    };
    const opportunityWrite = existing.data
      ? await this.client.from("opportunities").update(opportunityScore).eq("id", existing.data.id)
      : await this.client.from("opportunities").insert({
        company_id: businessId,
        qualification_state: "unassessed",
        sales_stage: "not_started",
        ...opportunityScore,
      });
    if (opportunityWrite.error) fail("Could not save explainable opportunity", opportunityWrite.error);
  }

  async markBusinessQualityVerified(businessId: string): Promise<void> {
    const { error } = await this.client
      .from("businesses")
      .update({ lead_quality_status: "verified", quality_reason: null, quality_checked_at: new Date().toISOString() })
      .eq("id", businessId);
    if (error) fail("Could not mark lead quality verified", error);
  }

  async markBusinessQualityNeedsReaudit(businessId: string, reason: string): Promise<void> {
    const { error } = await this.client
      .from("businesses")
      .update({ lead_quality_status: "needs_reaudit", quality_reason: reason, quality_checked_at: null })
      .eq("id", businessId);
    if (error) fail("Could not mark lead for quality review", error);
  }

  async listBusinessesNeedingReaudit(limit: number): Promise<Array<ExistingLeadForReaudit & { name: string }>> {
    const { data, error } = await this.client
      .from("businesses")
      .select("id,name,website_url,phone,rating,review_count,category_id")
      .eq("lead_quality_status", "needs_reaudit")
      .order("updated_at", { ascending: true })
      .limit(limit);
    if (error) fail("Could not list businesses needing re-audit", error);
    return (data ?? []).map((row) => ({
      businessId: row.id as string,
      name: row.name as string,
      websiteUrl: row.website_url as string | null,
      phone: row.phone as string | null,
      rating: row.rating === null ? null : Number(row.rating),
      reviewCount: Number(row.review_count),
      categoryId: row.category_id as string,
    }));
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
