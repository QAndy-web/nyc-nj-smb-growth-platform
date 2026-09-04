import { createAdminClient } from "./supabase";

export type LeadRow = {
  id: string;
  google_place_id: string;
  name: string;
  address: string | null;
  state: "NY" | "NJ";
  city: string;
  territory_id: string;
  category_id: string;
  rating: number | null;
  review_count: number;
  website_url: string | null;
  phone: string | null;
  google_maps_url: string | null;
  website_status: "missing" | "unreachable" | "weak" | "reachable" | "unknown" | null;
  business_quality: number | null;
  digital_weakness: number | null;
  revenue_potential: number | null;
  opportunity_score: number | null;
  tier: "S" | "A" | "B" | "C" | null;
  has_email: boolean;
  email_count: number;
  primary_email: string | null;
  email_source_url: string | null;
  pipeline_stage: "discovered" | "qualified" | "audit_ready" | "demo_ready" | "outreach_draft" | "contacted" | "replied" | "meeting" | "proposal" | "won" | "lost";
  pipeline_status: "active" | "paused" | "closed";
  stage_updated_at: string;
  lead_quality_status: "verified" | "needs_reaudit";
  quality_reason: string | null;
  quality_checked_at: string | null;
  last_seen_at: string;
};

export type LeadFilters = {
  state?: string;
  city?: string;
  territory?: string;
  category?: string;
  websiteStatus?: string;
  tier?: string;
  minScore?: number;
  minRating?: number;
  minReviews?: number;
  email?: "yes" | "no";
  pipelineStage?: string;
};

function optionalNumber(value: string | null): number | undefined {
  if (!value) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function parseLeadFilters(params: URLSearchParams): LeadFilters {
  const value = (key: string) => params.get(key)?.trim() || undefined;
  const email = value("email");
  return {
    state: value("state"),
    city: value("city"),
    territory: value("territory"),
    category: value("category"),
    websiteStatus: value("websiteStatus"),
    tier: value("tier"),
    minScore: optionalNumber(params.get("minScore")),
    minRating: optionalNumber(params.get("minRating")),
    minReviews: optionalNumber(params.get("minReviews")),
    email: email === "yes" || email === "no" ? email : undefined,
    pipelineStage: value("pipelineStage"),
  };
}

export async function listLeads(filters: LeadFilters, limit = 500) {
  const client = createAdminClient();
  let query = client
    .from("lead_dashboard")
    .select("*", { count: "exact" })
    .order("opportunity_score", { ascending: false, nullsFirst: false })
    .limit(limit);

  if (filters.state) query = query.eq("state", filters.state);
  if (filters.city) query = query.ilike("city", `%${filters.city}%`);
  if (filters.territory) query = query.eq("territory_id", filters.territory);
  if (filters.category) query = query.eq("category_id", filters.category);
  if (filters.websiteStatus) query = query.eq("website_status", filters.websiteStatus);
  if (filters.tier) query = query.eq("tier", filters.tier);
  if (filters.minScore !== undefined) query = query.gte("opportunity_score", filters.minScore);
  if (filters.minRating !== undefined) query = query.gte("rating", filters.minRating);
  if (filters.minReviews !== undefined) query = query.gte("review_count", filters.minReviews);
  if (filters.email) query = query.eq("has_email", filters.email === "yes");
  if (filters.pipelineStage) query = query.eq("pipeline_stage", filters.pipelineStage);

  const { data, error, count } = await query;
  if (error) throw new Error(`Could not load leads: ${error.message}`);
  return { rows: (data ?? []) as LeadRow[], count: count ?? 0 };
}

function csvCell(value: string | number | boolean | null): string {
  let text = value === null ? "" : String(value);
  if (/^[=+@-]/.test(text)) text = `'${text}`;
  return /[",\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

export function leadsToCsv(rows: LeadRow[]): string {
  const columns: Array<[string, keyof LeadRow]> = [
    ["name", "name"],
    ["state", "state"],
    ["city", "city"],
    ["territory", "territory_id"],
    ["category", "category_id"],
    ["rating", "rating"],
    ["review_count", "review_count"],
    ["website_status", "website_status"],
    ["website_url", "website_url"],
    ["opportunity_score", "opportunity_score"],
    ["tier", "tier"],
    ["pipeline_stage", "pipeline_stage"],
    ["public_email", "primary_email"],
    ["email_source_url", "email_source_url"],
    ["phone", "phone"],
    ["google_maps_url", "google_maps_url"],
  ];
  return [
    columns.map(([header]) => csvCell(header)).join(","),
    ...rows.map((row) => columns.map(([, key]) => csvCell(row[key] as string | number | boolean | null)).join(",")),
  ].join("\n");
}
